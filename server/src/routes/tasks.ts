import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Surgery-type task templates — day offsets from surgery date
const SURGERY_TEMPLATES: Record<string, { dayNumber: number; category: string; title: string; description: string }[]> = {
  default: [
    { dayNumber: 1, category: 'WOUND_CARE',    title: 'Check incision site',           description: 'Inspect wound for redness, discharge, or unusual swelling. Do not remove bandage unless instructed.' },
    { dayNumber: 1, category: 'MEDICATION',    title: 'Take pain medication',          description: 'Take prescribed pain medication as scheduled. Do not skip doses.' },
    { dayNumber: 1, category: 'ACTIVITY',      title: 'Rest — minimal movement',       description: 'Stay in bed or a comfortable chair. Gentle leg movements to prevent blood clots.' },
    { dayNumber: 2, category: 'WOUND_CARE',    title: 'Change wound dressing',         description: 'Follow dressing change instructions provided by your nurse. Use sterile technique.' },
    { dayNumber: 2, category: 'ACTIVITY',      title: 'Short 5-minute walk',           description: 'Take a brief walk indoors. Stop if you feel pain or dizziness.' },
    { dayNumber: 2, category: 'NUTRITION',     title: 'Increase fluid intake',         description: 'Drink at least 8 glasses of water. Avoid alcohol and caffeine.' },
    { dayNumber: 3, category: 'WOUND_CARE',    title: 'Inspect wound for healing',     description: 'Look for signs of proper healing: edges coming together, no increasing redness.' },
    { dayNumber: 3, category: 'ACTIVITY',      title: 'Walk 10 minutes twice daily',   description: 'Increase walking time gradually. Stop if pain exceeds 6/10.' },
    { dayNumber: 3, category: 'NUTRITION',     title: 'Introduce soft foods',          description: 'Start with easily digestible foods: yogurt, soup, mashed vegetables.' },
    { dayNumber: 4, category: 'MENTAL_HEALTH', title: 'Mood and mental check-in',      description: 'Take a few minutes to journal how you feel emotionally. Recovery affects mental health too.' },
    { dayNumber: 5, category: 'WOUND_CARE',    title: 'Keep wound dry today',          description: 'Protect wound during any sponge bath. Do not submerge in water.' },
    { dayNumber: 5, category: 'ACTIVITY',      title: 'Gentle stretching exercises',   description: 'Perform the light stretches shown in your discharge guide. 3 repetitions of each.' },
    { dayNumber: 7, category: 'FOLLOW_UP',     title: '1-week check-in with care team','description': 'Prepare any questions for your nurse or doctor. Review current symptoms.' },
    { dayNumber: 7, category: 'WOUND_CARE',    title: 'Photo document incision',       description: 'Take a clear photo of your incision site for the wound journal.' },
    { dayNumber: 10, category: 'ACTIVITY',     title: 'Increase walking to 20 minutes','description': 'If feeling well, extend your daily walks to 20 minutes.' },
    { dayNumber: 10, category: 'NUTRITION',    title: 'Return to normal diet',         description: 'Gradually return to your regular diet. Avoid heavy fried foods.' },
    { dayNumber: 14, category: 'FOLLOW_UP',    title: 'Final recovery appointment',    description: 'Attend your scheduled follow-up appointment. Bring your medication list.' },
  ],
  'Laparoscopic Cholecystectomy': [
    { dayNumber: 1, category: 'WOUND_CARE',    title: 'Monitor 3 incision sites',      description: 'You have multiple small incisions. Check each site for redness or leakage.' },
    { dayNumber: 1, category: 'NUTRITION',     title: 'Clear liquids only',            description: 'Stick to water, broth, and juice today. Avoid solid food.' },
    { dayNumber: 2, category: 'NUTRITION',     title: 'Low-fat diet only',             description: 'Without a gallbladder, fat digestion changes. Eat low-fat foods for 2 weeks.' },
    { dayNumber: 2, category: 'ACTIVITY',      title: 'Deep breathing exercises',      description: 'Take 10 deep breaths every hour to prevent lung complications after anesthesia.' },
    { dayNumber: 3, category: 'WOUND_CARE',    title: 'Remove steri-strips if loose',  description: 'If adhesive strips are peeling, remove them gently. Leave in place if still attached.' },
    { dayNumber: 5, category: 'ACTIVITY',      title: 'Short outdoor walk',            description: 'You can now walk outside briefly. Avoid hills or stairs.' },
    { dayNumber: 7, category: 'FOLLOW_UP',     title: 'Surgical review appointment',   description: 'Attend your post-op appointment. Surgeon will assess healing and remove sutures if needed.' },
    { dayNumber: 14, category: 'NUTRITION',    title: 'Gradual fat reintroduction',    description: 'Begin slowly reintroducing moderate fat foods. Monitor for digestive discomfort.' },
  ],
  'Knee Replacement': [
    { dayNumber: 1, category: 'ACTIVITY',      title: 'Ankle pumping exercises',       description: 'Move your ankles up and down 10 times per hour to promote circulation.' },
    { dayNumber: 1, category: 'WOUND_CARE',    title: 'Apply ice pack (20 min)',       description: 'Apply ice to knee for 20 minutes every 2 hours to control swelling.' },
    { dayNumber: 2, category: 'ACTIVITY',      title: 'Quad sets exercise',            description: 'Tighten your thigh muscle with leg straight. Hold 5 seconds, 10 reps.' },
    { dayNumber: 3, category: 'ACTIVITY',      title: 'Physiotherapy session',         description: 'Attend or perform prescribed physiotherapy exercises. Bend knee slowly.' },
    { dayNumber: 5, category: 'ACTIVITY',      title: 'Walk with assistive device',    description: 'Use walker or crutches as instructed. Do not bear full weight without support.' },
    { dayNumber: 7, category: 'ACTIVITY',      title: 'Straight leg raises',           description: 'Lie flat, tighten quad, raise leg 12 inches. Hold 5 seconds. 10 reps.' },
    { dayNumber: 14, category: 'FOLLOW_UP',    title: 'Physiotherapy re-evaluation',   description: 'Your physiotherapist will assess range of motion and adjust your program.' },
    { dayNumber: 21, category: 'ACTIVITY',     title: 'Stair climbing practice',       description: 'Practice climbing stairs with supervision. Lead with strong leg going up, weak leg going down.' },
  ],
  'Appendectomy': [
    { dayNumber: 1, category: 'WOUND_CARE',    title: 'Monitor incision for bleeding', description: 'Report any bleeding soaking through dressing immediately to care team.' },
    { dayNumber: 1, category: 'NUTRITION',     title: 'Clear fluids post-op',          description: 'Advance slowly from clear fluids to light diet as tolerated.' },
    { dayNumber: 2, category: 'ACTIVITY',      title: 'Avoid lifting anything > 5 lbs','description': 'No lifting for 2 weeks. This prevents incisional hernia formation.' },
    { dayNumber: 3, category: 'WOUND_CARE',    title: 'Check for sign of infection',   description: 'Wound warmth, increasing redness, or pus require immediate medical attention.' },
    { dayNumber: 5, category: 'NUTRITION',     title: 'High-fiber diet',               description: 'Eat fiber-rich foods to promote regular bowel movements after surgery.' },
    { dayNumber: 7, category: 'FOLLOW_UP',     title: 'Surgical wound review',         description: 'Doctor will check healing and remove sutures or staples if used.' },
  ],
};

function getTemplate(surgeryType: string) {
  for (const key of Object.keys(SURGERY_TEMPLATES)) {
    if (key !== 'default' && surgeryType.toLowerCase().includes(key.toLowerCase())) {
      // Merge with default
      const specific = SURGERY_TEMPLATES[key];
      const defaultDays = new Set(specific.map(t => t.dayNumber));
      const merged = [...specific];
      for (const t of SURGERY_TEMPLATES.default) {
        if (!defaultDays.has(t.dayNumber)) merged.push(t);
        else {
          // Add default tasks on same day if different category
          const sameDay = specific.filter(s => s.dayNumber === t.dayNumber);
          if (!sameDay.some(s => s.category === t.category)) merged.push(t);
        }
      }
      return merged.sort((a, b) => a.dayNumber - b.dayNumber);
    }
  }
  return SURGERY_TEMPLATES.default;
}

// ─── Patient task routes ──────────────────────────────────────────────────────

// GET /api/tasks/today
router.get('/today', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const today = new Date();
    const dayNumber = Math.max(1, Math.ceil((today.getTime() - new Date(patient.surgeryDate).getTime()) / 86400000));

    const tasks = await prisma.recoveryTask.findMany({
      where: { patientId: patient.id, dayNumber },
      orderBy: { category: 'asc' },
    });

    const totalCompleted = await prisma.recoveryTask.count({ where: { patientId: patient.id, isCompleted: true } });
    const totalTasks = await prisma.recoveryTask.count({ where: { patientId: patient.id } });

    res.json({ tasks, dayNumber, totalCompleted, totalTasks, overallProgress: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0 });
  } catch (error) {
    console.error('Get today tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/week
router.get('/week', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const dayNumber = Math.max(1, Math.ceil((Date.now() - new Date(patient.surgeryDate).getTime()) / 86400000));
    const from = Math.max(1, dayNumber - 1);
    const to = dayNumber + 6;

    const tasks = await prisma.recoveryTask.findMany({
      where: { patientId: patient.id, dayNumber: { gte: from, lte: to } },
      orderBy: [{ dayNumber: 'asc' }, { category: 'asc' }],
    });

    res.json({ tasks, currentDay: dayNumber });
  } catch (error) {
    console.error('Get week tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/complete
router.put('/:id/complete', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const task = await prisma.recoveryTask.findFirst({ where: { id: req.params.id, patientId: patient.id } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    const updated = await prisma.recoveryTask.update({
      where: { id: task.id },
      data: { isCompleted: !task.isCompleted, completedAt: !task.isCompleted ? new Date() : null },
    });

    res.json(updated);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/journal - Create journal entry
router.post('/journal', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const { content, mood, energyLevel, sleepHours, anxietyLevel, gratitude } = req.body;
    if (!content) { res.status(400).json({ error: 'content is required' }); return; }

    // Simple keyword sentiment analysis
    const concernKeywords = ['pain', 'bleeding', 'fever', 'infection', 'worse', 'terrible', 'scared', 'discharge', 'swelling', 'numb'];
    const positiveKeywords = ['better', 'improving', 'good', 'great', 'healed', 'comfortable', 'walking', 'eating', 'sleeping'];
    const lowerContent = content.toLowerCase();
    const flagged = concernKeywords.filter(k => lowerContent.includes(k));
    const positives = positiveKeywords.filter(k => lowerContent.includes(k));
    const sentimentScore = Math.max(-1, Math.min(1, (positives.length - flagged.length) / Math.max(1, positives.length + flagged.length)));

    const entry = await prisma.journalEntry.create({
      data: { patientId: patient.id, content, mood, energyLevel, sleepHours, anxietyLevel, gratitude, sentimentScore, flaggedKeywords: flagged },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Create journal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/journal
router.get('/journal', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findFirst({ where: { userId: req.userId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const entries = await prisma.journalEntry.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    res.json(entries);
  } catch (error) {
    console.error('Get journal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Staff task management ────────────────────────────────────────────────────

// POST /api/tasks/staff/patients/:patientId/care-plan  — apply surgery template
router.post('/staff/patients/:patientId/care-plan', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff not found' }); return; }

    const patient = await prisma.patient.findUnique({ where: { id: req.params.patientId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const { clearExisting } = req.body;
    if (clearExisting) {
      await prisma.recoveryTask.deleteMany({ where: { patientId: patient.id } });
    }

    const template = getTemplate(patient.surgeryType);
    const tasks = await prisma.$transaction(
      template.map(t => prisma.recoveryTask.create({
        data: { patientId: patient.id, dayNumber: t.dayNumber, category: t.category as any, title: t.title, description: t.description, createdById: staff.id },
      }))
    );

    res.json({ created: tasks.length, surgeryType: patient.surgeryType });
  } catch (error) {
    console.error('Apply care plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/staff/patients/:patientId/tasks — add individual task
router.post('/staff/patients/:patientId/tasks', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: req.userId } });
    if (!staff) { res.status(404).json({ error: 'Staff not found' }); return; }

    const { dayNumber, category, title, description } = req.body;
    if (!dayNumber || !category || !title) { res.status(400).json({ error: 'dayNumber, category, and title are required' }); return; }

    const task = await prisma.recoveryTask.create({
      data: { patientId: req.params.patientId, dayNumber, category, title, description, createdById: staff.id },
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/staff/patients/:patientId/tasks
router.get('/staff/patients/:patientId/tasks', authenticate, requireRole('NURSE', 'DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tasks = await prisma.recoveryTask.findMany({
      where: { patientId: req.params.patientId },
      orderBy: [{ dayNumber: 'asc' }, { category: 'asc' }],
    });

    const completed = tasks.filter(t => t.isCompleted).length;
    res.json({ tasks, completed, total: tasks.length, adherence: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0 });
  } catch (error) {
    console.error('Get patient tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
export { getTemplate };
