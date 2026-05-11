import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { evaluateCheckIn } from '../services/alertEngine';

const router = Router();
const prisma = new PrismaClient();

// POST /api/checkins - Submit a daily check-in (PATIENT only)
router.post('/', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const { painLevel, temperature, symptoms, notes, mood } = req.body;
    if (painLevel === undefined || painLevel < 0 || painLevel > 10) {
      res.status(400).json({ error: 'Pain level must be between 0 and 10' });
      return;
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        patientId: patient.id,
        painLevel,
        temperature: temperature ?? null,
        symptoms: symptoms || [],
        notes: notes || null,
        mood: mood || null,
      },
    });

    const alert = await evaluateCheckIn({
      patientId: patient.id,
      checkInId: checkIn.id,
      painLevel,
      temperature: temperature || null,
      symptoms: symptoms || [],
    });

    res.status(201).json({ checkIn, alert: alert || null });
  } catch (error) {
    console.error('Create check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/checkins - Get check-in history (PATIENT only)
router.get('/', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const checkIns = await prisma.checkIn.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    res.json(checkIns);
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/checkins/latest - Get most recent check-in (PATIENT only)
router.get('/latest', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const checkIn = await prisma.checkIn.findFirst({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(checkIn);
  } catch (error) {
    console.error('Get latest check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
