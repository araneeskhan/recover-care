import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/wound-photos - Get all wound photos for patient
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const photos = await prisma.woundPhoto.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(photos);
  } catch (error) {
    console.error('Get wound photos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wound-photos - Create a wound photo entry
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const { photoUri, caption } = req.body;

    if (!photoUri) {
      res.status(400).json({ error: 'Photo URI is required' });
      return;
    }

    const photo = await prisma.woundPhoto.create({
      data: {
        patientId: patient.id,
        photoUri,
        caption: caption || null,
      },
    });

    res.status(201).json(photo);
  } catch (error) {
    console.error('Create wound photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
