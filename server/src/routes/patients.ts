import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/patients/me - Get current patient profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
      include: {
        careTeam: {
          include: {
            staff: true,
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    // Calculate current recovery day
    const surgeryDate = new Date(patient.surgeryDate);
    const today = new Date();
    const diffTime = today.getTime() - surgeryDate.getTime();
    const currentDay = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    res.json({
      ...patient,
      currentDay: Math.min(currentDay, patient.recoveryDays),
      daysRemaining: Math.max(0, patient.recoveryDays - currentDay),
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/me/dashboard - Home screen data
router.get('/me/dashboard', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    // Recovery day
    const surgeryDate = new Date(patient.surgeryDate);
    const today = new Date();
    const diffTime = today.getTime() - surgeryDate.getTime();
    const currentDay = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Latest check-in
    const latestCheckIn = await prisma.checkIn.findFirst({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
    });

    // Today's check-in
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaysCheckIn = await prisma.checkIn.findFirst({
      where: {
        patientId: patient.id,
        createdAt: { gte: startOfToday },
      },
    });

    // Upcoming medications
    const medications = await prisma.medication.findMany({
      where: { patientId: patient.id, isActive: true },
      orderBy: { nextDoseAt: 'asc' },
    });

    // Upcoming appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        dateTime: { gte: new Date() },
      },
      orderBy: { dateTime: 'asc' },
      take: 3,
    });

    // Unread messages count
    const unreadCount = await prisma.message.count({
      where: {
        patientId: patient.id,
        senderType: { not: 'PATIENT' },
        isRead: false,
      },
    });

    // Alerts
    const activeAlerts = await prisma.alert.findMany({
      where: {
        patientId: patient.id,
        isResolved: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        surgeryType: patient.surgeryType,
        surgeryDate: patient.surgeryDate,
        hospital: patient.hospital,
      },
      recovery: {
        currentDay: Math.min(currentDay, patient.recoveryDays),
        totalDays: patient.recoveryDays,
        daysRemaining: Math.max(0, patient.recoveryDays - currentDay),
        isOnTrack: !activeAlerts.some((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH'),
      },
      vitals: latestCheckIn
        ? {
            painLevel: latestCheckIn.painLevel,
            temperature: latestCheckIn.temperature,
            lastCheckInTime: latestCheckIn.createdAt,
          }
        : null,
      hasCheckedInToday: !!todaysCheckIn,
      medications,
      appointments,
      unreadMessages: unreadCount,
      alerts: activeAlerts,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/patients/me - Update patient profile
router.put('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const {
      firstName,
      lastName,
      age,
      hospital,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      bloodType,
      allergies,
      address,
    } = req.body;

    // Build update data — only include fields that were sent
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (age !== undefined) updateData.age = age;
    if (hospital !== undefined) updateData.hospital = hospital;
    if (phone !== undefined) updateData.phone = phone;
    if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone;
    if (bloodType !== undefined) updateData.bloodType = bloodType;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (address !== undefined) updateData.address = address;

    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: updateData,
      include: {
        careTeam: {
          include: {
            staff: true,
          },
        },
      },
    });

    // Calculate current recovery day
    const surgeryDate = new Date(updated.surgeryDate);
    const today = new Date();
    const diffTime = today.getTime() - surgeryDate.getTime();
    const currentDay = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    res.json({
      ...updated,
      currentDay: Math.min(currentDay, updated.recoveryDays),
      daysRemaining: Math.max(0, updated.recoveryDays - currentDay),
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/me/alerts - Get patient alerts
router.get('/me/alerts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const alerts = await prisma.alert.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
