import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/messages/conversations - List all conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    // Get unique staff members the patient has conversations with
    const careTeam = await prisma.careTeamAssignment.findMany({
      where: { patientId: patient.id },
      include: { staff: true },
    });

    const conversations = await Promise.all(
      careTeam.map(async (assignment) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            patientId: patient.id,
            staffId: assignment.staffId,
          },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await prisma.message.count({
          where: {
            patientId: patient.id,
            staffId: assignment.staffId,
            senderType: { not: 'PATIENT' },
            isRead: false,
          },
        });

        return {
          staff: assignment.staff,
          lastMessage,
          unreadCount,
        };
      })
    );

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/:staffId - Get messages in a conversation
router.get('/:staffId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const { staffId } = req.params;

    const messages = await prisma.message.findMany({
      where: {
        patientId: patient.id,
        staffId,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark all received messages as read
    await prisma.message.updateMany({
      where: {
        patientId: patient.id,
        staffId,
        senderType: { not: 'PATIENT' },
        isRead: false,
      },
      data: { isRead: true },
    });

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });

    res.json({ messages, staff });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages - Send a message
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.userId },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const { staffId, content } = req.body;

    if (!staffId || !content) {
      res.status(400).json({ error: 'staffId and content are required' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        patientId: patient.id,
        staffId,
        content,
        senderId: patient.id,
        senderType: 'PATIENT',
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
