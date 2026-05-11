import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ─── Staff Profile ──────────────────────────────────────────────────────────

// GET /api/staff/me
router.get('/me', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({
      where: { userId: req.userId },
      include: {
        assignments: { include: { patient: true } },
      },
    });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    res.json({ ...staff, email: user?.email, role: req.userRole });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/staff/me
router.put('/me', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { firstName, lastName, specialty, department, phone } = req.body;
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (department !== undefined) updateData.department = department;
    if (phone !== undefined) updateData.phone = phone;

    const updated = await prisma.staff.update({ where: { id: staff.id }, data: updateData });
    res.json(updated);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Staff Dashboard ────────────────────────────────────────────────────────

// GET /api/staff/dashboard
router.get('/dashboard', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const assignments = await prisma.careTeamAssignment.findMany({
      where: { staffId: staff.id },
      include: { patient: true },
    });
    const patientIds = assignments.map(a => a.patientId);

    const [criticalAlerts, highAlerts, unresolvedAlerts, unreadMessages, todayCheckIns, patients] = await Promise.all([
      prisma.alert.count({ where: { patientId: { in: patientIds }, severity: 'CRITICAL', isResolved: false } }),
      prisma.alert.count({ where: { patientId: { in: patientIds }, severity: 'HIGH', isResolved: false } }),
      prisma.alert.findMany({
        where: { patientId: { in: patientIds }, isResolved: false },
        include: { patient: true },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      prisma.message.count({
        where: { patientId: { in: patientIds }, staffId: staff.id, senderType: 'PATIENT', isRead: false },
      }),
      (async () => {
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        return prisma.checkIn.count({ where: { patientId: { in: patientIds }, createdAt: { gte: startOfToday } } });
      })(),
      prisma.patient.findMany({
        where: { id: { in: patientIds } },
        include: {
          checkIns: { orderBy: { createdAt: 'desc' }, take: 1 },
          alerts: { where: { isResolved: false }, orderBy: { severity: 'desc' }, take: 1 },
        },
      }),
    ]);

    const patientsWithStatus = patients.map(p => {
      const surgeryDate = new Date(p.surgeryDate);
      const currentDay = Math.max(1, Math.ceil((Date.now() - surgeryDate.getTime()) / 86400000));
      const latestCheckIn = p.checkIns[0] ?? null;
      const topAlert = p.alerts[0] ?? null;
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        mrn: p.mrn,
        surgeryType: p.surgeryType,
        currentDay: Math.min(currentDay, p.recoveryDays),
        totalDays: p.recoveryDays,
        latestPain: latestCheckIn?.painLevel ?? null,
        latestTemp: latestCheckIn?.temperature ?? null,
        lastCheckIn: latestCheckIn?.createdAt ?? null,
        topAlertSeverity: topAlert?.severity ?? null,
      };
    });

    res.json({
      staff: { firstName: staff.firstName, lastName: staff.lastName, role: req.userRole, specialty: staff.specialty },
      summary: { totalPatients: patientIds.length, criticalAlerts, highAlerts, unreadMessages, todayCheckIns },
      recentAlerts: unresolvedAlerts,
      patients: patientsWithStatus,
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Patient Management ─────────────────────────────────────────────────────

// GET /api/staff/patients - List assigned patients with search
router.get('/patients', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { search, severity } = req.query;

    const assignments = await prisma.careTeamAssignment.findMany({
      where: { staffId: staff.id },
      select: { patientId: true },
    });
    const patientIds = assignments.map(a => a.patientId);

    const patients = await prisma.patient.findMany({
      where: {
        id: { in: patientIds },
        ...(search ? {
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } },
            { mrn: { contains: search as string, mode: 'insensitive' } },
            { surgeryType: { contains: search as string, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        checkIns: { orderBy: { createdAt: 'desc' }, take: 1 },
        alerts: { where: { isResolved: false }, orderBy: { severity: 'desc' }, take: 1 },
        medications: { where: { isActive: true }, select: { id: true } },
      },
    });

    const enriched = patients
      .map(p => {
        const surgeryDate = new Date(p.surgeryDate);
        const currentDay = Math.max(1, Math.ceil((Date.now() - surgeryDate.getTime()) / 86400000));
        const latestCheckIn = p.checkIns[0] ?? null;
        const topAlert = p.alerts[0] ?? null;
        return {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          mrn: p.mrn,
          age: p.age,
          surgeryType: p.surgeryType,
          surgeryDate: p.surgeryDate,
          hospital: p.hospital,
          currentDay: Math.min(currentDay, p.recoveryDays),
          totalDays: p.recoveryDays,
          activeMedications: p.medications.length,
          latestPain: latestCheckIn?.painLevel ?? null,
          latestTemp: latestCheckIn?.temperature ?? null,
          lastCheckIn: latestCheckIn?.createdAt ?? null,
          topAlertSeverity: topAlert?.severity ?? null,
          bloodType: p.bloodType,
          allergies: p.allergies,
        };
      })
      .filter(p => !severity || p.topAlertSeverity === severity);

    res.json(enriched);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/staff/patients/:patientId - Full patient detail
router.get('/patients/:patientId', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { patientId } = req.params;

    const assignment = await prisma.careTeamAssignment.findUnique({
      where: { patientId_staffId: { patientId, staffId: staff.id } },
    });
    if (!assignment) { res.status(403).json({ error: 'Patient not in your care team' }); return; }

    const [patient, checkIns, medications, alerts, appointments, woundPhotos] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        include: { careTeam: { include: { staff: true } } },
      }),
      prisma.checkIn.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.medication.findMany({ where: { patientId }, include: { logs: { orderBy: { takenAt: 'desc' }, take: 5 } } }),
      prisma.alert.findMany({
        where: { patientId },
        include: { resolvedBy: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.appointment.findMany({ where: { patientId }, orderBy: { dateTime: 'asc' } }),
      prisma.woundPhoto.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const surgeryDate = new Date(patient.surgeryDate);
    const currentDay = Math.max(1, Math.ceil((Date.now() - surgeryDate.getTime()) / 86400000));
    const totalMedDoses = medications.reduce((s, m) => s + m.totalDoses, 0);
    const takenMedDoses = medications.reduce((s, m) => s + m.takenDoses, 0);

    res.json({
      patient: {
        ...patient,
        currentDay: Math.min(currentDay, patient.recoveryDays),
        daysRemaining: Math.max(0, patient.recoveryDays - currentDay),
        medicationAdherence: totalMedDoses > 0 ? Math.round((takenMedDoses / totalMedDoses) * 100) : 0,
      },
      checkIns,
      medications,
      alerts,
      appointments,
      woundPhotos,
    });
  } catch (error) {
    console.error('Get patient detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Alert Management ───────────────────────────────────────────────────────

// GET /api/staff/alerts - All unresolved alerts for assigned patients
router.get('/alerts', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const assignments = await prisma.careTeamAssignment.findMany({ where: { staffId: staff.id }, select: { patientId: true } });
    const patientIds = assignments.map(a => a.patientId);

    const { resolved, severity } = req.query;
    const isResolved = resolved === 'true' ? true : resolved === 'false' ? false : undefined;

    const alerts = await prisma.alert.findMany({
      where: {
        patientId: { in: patientIds },
        ...(isResolved !== undefined ? { isResolved } : {}),
        ...(severity ? { severity: severity as any } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true, surgeryType: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ isResolved: 'asc' }, { severity: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(alerts);
  } catch (error) {
    console.error('Get staff alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/staff/alerts/:alertId/resolve - Resolve an alert
router.put('/alerts/:alertId/resolve', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { alertId } = req.params;
    const { resolutionNote } = req.body;

    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) { res.status(404).json({ error: 'Alert not found' }); return; }

    const assignment = await prisma.careTeamAssignment.findUnique({
      where: { patientId_staffId: { patientId: alert.patientId, staffId: staff.id } },
    });
    if (!assignment) { res.status(403).json({ error: 'Alert not in your care team' }); return; }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedById: staff.id,
        resolvedAt: new Date(),
        resolutionNote: resolutionNote ?? null,
      },
      include: { patient: true, resolvedBy: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Messaging ──────────────────────────────────────────────────────────────

// GET /api/staff/messages - All patient conversations for this staff member
router.get('/messages', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const assignments = await prisma.careTeamAssignment.findMany({
      where: { staffId: staff.id },
      include: { patient: true },
    });

    const conversations = await Promise.all(
      assignments.map(async (a) => {
        const lastMessage = await prisma.message.findFirst({
          where: { patientId: a.patientId, staffId: staff.id },
          orderBy: { createdAt: 'desc' },
        });
        const unreadCount = await prisma.message.count({
          where: { patientId: a.patientId, staffId: staff.id, senderType: 'PATIENT', isRead: false },
        });
        return { patient: a.patient, lastMessage, unreadCount };
      })
    );

    res.json(conversations.sort((a, b) => {
      const ta = a.lastMessage?.createdAt?.getTime() ?? 0;
      const tb = b.lastMessage?.createdAt?.getTime() ?? 0;
      return tb - ta;
    }));
  } catch (error) {
    console.error('Get staff conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/staff/messages/:patientId - Get conversation thread with a patient
router.get('/messages/:patientId', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { patientId } = req.params;

    const assignment = await prisma.careTeamAssignment.findUnique({
      where: { patientId_staffId: { patientId, staffId: staff.id } },
    });
    if (!assignment) { res.status(403).json({ error: 'Patient not in your care team' }); return; }

    const messages = await prisma.message.findMany({
      where: { patientId, staffId: staff.id },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.message.updateMany({
      where: { patientId, staffId: staff.id, senderType: 'PATIENT', isRead: false },
      data: { isRead: true },
    });

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    res.json({ messages, patient });
  } catch (error) {
    console.error('Get staff messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/staff/messages - Send message to patient
router.post('/messages', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { patientId, content } = req.body;
    if (!patientId || !content?.trim()) { res.status(400).json({ error: 'patientId and content are required' }); return; }

    const assignment = await prisma.careTeamAssignment.findUnique({
      where: { patientId_staffId: { patientId, staffId: staff.id } },
    });
    if (!assignment) { res.status(403).json({ error: 'Patient not in your care team' }); return; }

    const message = await prisma.message.create({
      data: {
        patientId,
        staffId: staff.id,
        content: content.trim(),
        senderId: staff.id,
        senderType: req.userRole as any,
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send staff message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Doctor-only: Medication Management ─────────────────────────────────────

// POST /api/staff/patients/:patientId/medications - Prescribe medication (DOCTOR only)
router.post('/patients/:patientId/medications', authenticate, requireRole('DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { patientId } = req.params;
    const assignment = await prisma.careTeamAssignment.findUnique({
      where: { patientId_staffId: { patientId, staffId: staff.id } },
    });
    if (!assignment) { res.status(403).json({ error: 'Patient not in your care team' }); return; }

    const { name, dosage, frequency, instructions, totalDoses } = req.body;
    if (!name || !dosage || !frequency || !totalDoses) {
      res.status(400).json({ error: 'name, dosage, frequency, and totalDoses are required' });
      return;
    }

    const medication = await prisma.medication.create({
      data: { patientId, name, dosage, frequency, instructions: instructions ?? null, totalDoses: parseInt(totalDoses) },
    });

    res.status(201).json(medication);
  } catch (error) {
    console.error('Prescribe medication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/staff/patients/:patientId/medications/:medId - Update medication (DOCTOR only)
router.put('/patients/:patientId/medications/:medId', authenticate, requireRole('DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { patientId, medId } = req.params;
    const assignment = await prisma.careTeamAssignment.findUnique({
      where: { patientId_staffId: { patientId, staffId: staff.id } },
    });
    if (!assignment) { res.status(403).json({ error: 'Patient not in your care team' }); return; }

    const { dosage, frequency, instructions, isActive } = req.body;
    const updateData: any = {};
    if (dosage !== undefined) updateData.dosage = dosage;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.medication.update({ where: { id: medId }, data: updateData });
    res.json(updated);
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/staff/patients/:patientId/appointments - Schedule appointment (DOCTOR/NURSE)
router.post('/patients/:patientId/appointments', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { patientId } = req.params;
    const assignment = await prisma.careTeamAssignment.findUnique({
      where: { patientId_staffId: { patientId, staffId: staff.id } },
    });
    if (!assignment) { res.status(403).json({ error: 'Patient not in your care team' }); return; }

    const { title, description, dateTime, duration } = req.body;
    if (!title || !dateTime) { res.status(400).json({ error: 'title and dateTime are required' }); return; }

    const appointment = await prisma.appointment.create({
      data: { patientId, title, description: description ?? null, dateTime: new Date(dateTime), duration: duration ?? 30 },
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Schedule appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/staff/checkins/:checkInId/notes - Add clinical note to check-in (NURSE/DOCTOR)
router.put('/checkins/:checkInId/notes', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return; }

    const { checkInId } = req.params;
    const { staffNotes } = req.body;
    if (!staffNotes) { res.status(400).json({ error: 'staffNotes is required' }); return; }

    const checkIn = await prisma.checkIn.findUnique({ where: { id: checkInId } });
    if (!checkIn) { res.status(404).json({ error: 'Check-in not found' }); return; }

    const assignment = await prisma.careTeamAssignment.findUnique({
      where: { patientId_staffId: { patientId: checkIn.patientId, staffId: staff.id } },
    });
    if (!assignment) { res.status(403).json({ error: 'Patient not in your care team' }); return; }

    const updated = await prisma.checkIn.update({ where: { id: checkInId }, data: { staffNotes } });
    res.json(updated);
  } catch (error) {
    console.error('Add staff note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
