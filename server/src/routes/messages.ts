import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/messages/conversations - Patient: list all conversations
router.get('/conversations', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const careTeam = await prisma.careTeamAssignment.findMany({
      where: { patientId: patient.id },
      include: { staff: true },
    });

    const conversations = await Promise.all(
      careTeam.map(async (assignment) => {
        const lastMessage = await prisma.message.findFirst({
          where: { patientId: patient.id, staffId: assignment.staffId },
          orderBy: { createdAt: 'desc' },
        });
        const unreadCount = await prisma.message.count({
          where: { patientId: patient.id, staffId: assignment.staffId, senderType: { not: 'PATIENT' }, isRead: false },
        });
        return { staff: assignment.staff, lastMessage, unreadCount };
      })
    );

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/:staffId - Patient: get conversation thread
router.get('/:staffId', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const { staffId } = req.params;

    const messages = await prisma.message.findMany({
      where: { patientId: patient.id, staffId },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.message.updateMany({
      where: { patientId: patient.id, staffId, senderType: { not: 'PATIENT' }, isRead: false },
      data: { isRead: true },
    });

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    res.json({ messages, staff });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages - Patient: send message to staff
router.post('/', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const { staffId, content } = req.body;
    if (!staffId || !content?.trim()) {
      res.status(400).json({ error: 'staffId and content are required' });
      return;
    }

    const message = await prisma.message.create({
      data: { patientId: patient.id, staffId, content: content.trim(), senderId: patient.id, senderType: 'PATIENT' },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
