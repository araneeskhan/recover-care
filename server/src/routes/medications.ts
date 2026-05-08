import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/medications - Get all medications
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const medications = await prisma.medication.findMany({
      where: { patientId: patient.id },
      include: {
        logs: {
          orderBy: { takenAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate active count and next dose info
    const activeMeds = medications.filter((m) => m.isActive);
    let nextDose: Date | null = null;
    for (const med of activeMeds) {
      if (med.nextDoseAt && (!nextDose || med.nextDoseAt < nextDose)) {
        nextDose = med.nextDoseAt;
      }
    }

    res.json({
      medications,
      activeCount: activeMeds.length,
      nextDose,
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medications/:id/take - Mark medication as taken
router.post('/:id/take', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const medication = await prisma.medication.findUnique({ where: { id } });
    if (!medication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }

    // Create log entry
    const log = await prisma.medicationLog.create({
      data: { medicationId: id },
    });

    // Update taken count and next dose time
    const newTakenDoses = medication.takenDoses + 1;

    // Calculate next dose time based on frequency
    let nextDoseAt: Date | null = null;
    if (medication.frequency.includes('daily')) {
      nextDoseAt = new Date();
      if (medication.frequency.includes('3×')) {
        nextDoseAt.setHours(nextDoseAt.getHours() + 8);
      } else if (medication.frequency.includes('2×')) {
        nextDoseAt.setHours(nextDoseAt.getHours() + 12);
      } else {
        nextDoseAt.setDate(nextDoseAt.getDate() + 1);
        nextDoseAt.setHours(8, 0, 0, 0);
      }
    }

    const updated = await prisma.medication.update({
      where: { id },
      data: {
        takenDoses: newTakenDoses,
        nextDoseAt,
      },
    });

    res.json({ medication: updated, log });
  } catch (error) {
    console.error('Take medication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/medications/schedule - Get today's medication schedule
router.get('/schedule', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const medications = await prisma.medication.findMany({
      where: { patientId: patient.id, isActive: true },
      include: {
        logs: {
          where: {
            takenAt: { gte: startOfDay, lte: endOfDay },
          },
        },
      },
    });

    // Calculate daily schedule
    const schedule = medications.map((med) => {
      let totalDailyDoses = 1;
      if (med.frequency.includes('3×')) totalDailyDoses = 3;
      else if (med.frequency.includes('2×') || med.frequency.includes('twice')) totalDailyDoses = 2;
      else if (med.frequency.includes('Every 6h')) totalDailyDoses = 4;
      else if (med.frequency.includes('Every 8h')) totalDailyDoses = 3;

      return {
        ...med,
        totalDailyDoses,
        takenToday: med.logs.length,
        remainingToday: Math.max(0, totalDailyDoses - med.logs.length),
      };
    });

    res.json(schedule);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
