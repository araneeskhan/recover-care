import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface CheckInData {
  patientId: string;
  checkInId?: string;
  painLevel: number;
  temperature: number | null;
  symptoms: string[];
  mood?: string;
}

interface AlertResult {
  severity: AlertSeverity;
  message: string;
}

// ─── Immediate threshold evaluation ──────────────────────────────────────────

function evaluateImmediate(data: CheckInData): AlertResult | null {
  const { painLevel, temperature, symptoms } = data;

  if (painLevel >= 8 && temperature && temperature > 38.5) {
    return { severity: 'CRITICAL', message: `🚨 CRITICAL: Pain ${painLevel}/10 combined with fever ${temperature}°C. High risk of post-surgical infection. Immediate medical review required.` };
  }
  if (painLevel >= 9) {
    return { severity: 'CRITICAL', message: `🚨 CRITICAL: Extreme pain level ${painLevel}/10 reported. Urgent clinical review needed — pain may indicate complication.` };
  }
  if (painLevel >= 8) {
    return { severity: 'HIGH', message: `⚠️ HIGH: Severe pain ${painLevel}/10. Review pain management protocol and assess for surgical site issues.` };
  }
  if (temperature && temperature > 38.5) {
    return { severity: 'HIGH', message: `⚠️ HIGH: Fever ${temperature}°C detected. Monitor for signs of wound infection or systemic inflammation.` };
  }
  if (temperature && temperature > 38.0 && painLevel >= 6) {
    return { severity: 'HIGH', message: `⚠️ HIGH: Moderate fever ${temperature}°C with pain ${painLevel}/10. Combined presentation warrants clinical review.` };
  }

  const dangerSymptomCombos: [string, string, string][] = [
    ['Chest Pain', 'Shortness of Breath', '🚨 CRITICAL: Chest pain with breathing difficulty — possible pulmonary embolism. Seek emergency care immediately.'],
    ['Wound Redness', 'Discharge/Pus', '⚠️ HIGH: Wound signs of infection (redness + discharge). Immediate wound assessment required.'],
    ['Swelling', 'Redness', '📋 MEDIUM: Inflammatory signs at wound site. Clinical assessment recommended within 24 hours.'],
  ];
  for (const [s1, s2, msg] of dangerSymptomCombos) {
    if (symptoms.includes(s1) && symptoms.includes(s2)) {
      const severity: AlertSeverity = msg.startsWith('🚨') ? 'CRITICAL' : msg.startsWith('⚠️') ? 'HIGH' : 'MEDIUM';
      return { severity, message: msg };
    }
  }

  if (symptoms.length >= 4) {
    return { severity: 'MEDIUM', message: `📋 MEDIUM: Patient reports ${symptoms.length} concurrent symptoms: ${symptoms.join(', ')}. Increased monitoring recommended.` };
  }
  if (symptoms.length >= 3) {
    return { severity: 'MEDIUM', message: `📋 MEDIUM: Multiple symptoms reported (${symptoms.join(', ')}). Review at next scheduled contact.` };
  }

  return null;
}

// ─── Trend analysis across recent check-ins ───────────────────────────────────

async function evaluateTrends(data: CheckInData, recent: any[]): Promise<AlertResult | null> {
  const { painLevel, temperature, mood, patientId } = data;

  if (recent.length < 2) return null;

  // ── 1. Pain spike ──
  const prevPain = recent[0].painLevel;
  if (painLevel - prevPain >= 3) {
    return { severity: 'MEDIUM', message: `📋 MEDIUM: Pain escalated from ${prevPain} → ${painLevel}/10 since last check-in. Unexpected spike warrants monitoring.` };
  }

  // ── 2. Consecutive high fever (3+ days ≥ 38°C) ──
  if (temperature && temperature >= 38.0) {
    const feverStreak = recent.filter(c => c.temperature && c.temperature >= 38.0).length;
    if (feverStreak >= 2) {
      const sev: AlertSeverity = feverStreak >= 3 ? 'HIGH' : 'MEDIUM';
      return { severity: sev, message: `${sev === 'HIGH' ? '⚠️ HIGH' : '📋 MEDIUM'}: Temperature ≥ 38°C for ${feverStreak + 1} consecutive check-ins. Sustained fever pattern — review for infection.` };
    }
  }

  // ── 3. Pain escalation trend (linear slope over last 5) ──
  if (recent.length >= 4) {
    const pts = [...recent.slice(0, 4).reverse(), { painLevel }];
    const n = pts.length;
    const sx = pts.reduce((s, _, i) => s + i, 0);
    const sy = pts.reduce((s, p) => s + p.painLevel, 0);
    const sxy = pts.reduce((s, p, i) => s + i * p.painLevel, 0);
    const sx2 = pts.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
    if (slope >= 0.8) {
      return { severity: 'HIGH', message: `⚠️ HIGH: Pain trending upward (slope +${slope.toFixed(1)}/day over 5 check-ins). Recovery trajectory not improving — clinical review needed.` };
    }
    if (slope >= 0.4) {
      return { severity: 'MEDIUM', message: `📋 MEDIUM: Gradual pain increase detected over recent check-ins. Monitor closely for further deterioration.` };
    }
  }

  // ── 4. Mood deterioration streak ──
  const badMoods = new Set(['poor', 'bad', 'terrible']);
  if (mood && badMoods.has(mood)) {
    const moodStreak = recent.filter(c => c.mood && badMoods.has(c.mood)).length;
    if (moodStreak >= 2) {
      return { severity: 'MEDIUM', message: `📋 MEDIUM: Patient has reported low mood (${mood}) for ${moodStreak + 1} consecutive check-ins. Consider mental health support — depression can impede recovery.` };
    }
  }

  // ── 5. Symptom persistence (same symptom 4+ consecutive days) ──
  if (recent.length >= 3) {
    const currentSymptoms = new Set(data.symptoms);
    const persistentSymptoms: string[] = [];
    for (const sym of Array.from(currentSymptoms)) {
      const streak = recent.filter(c => (c.symptoms || []).includes(sym)).length;
      if (streak >= 3) persistentSymptoms.push(sym);
    }
    if (persistentSymptoms.length > 0) {
      return { severity: 'MEDIUM', message: `📋 MEDIUM: Persistent symptoms for 4+ days: ${persistentSymptoms.join(', ')}. Long-lasting symptoms require reassessment.` };
    }
  }

  // ── 6. Recovery plateau — no improvement after day 10 ──
  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (patient) {
      const dayNumber = Math.ceil((Date.now() - new Date(patient.surgeryDate).getTime()) / 86400000);
      if (dayNumber > 10 && painLevel >= 6 && recent.length >= 3) {
        const avgRecentPain = recent.slice(0, 3).reduce((s, c) => s + c.painLevel, 0) / 3;
        if (avgRecentPain >= 6) {
          return { severity: 'HIGH', message: `⚠️ HIGH: Patient is on Day ${dayNumber} of recovery but pain remains high (avg ${avgRecentPain.toFixed(1)}/10). Expected improvement not observed — re-evaluate treatment plan.` };
        }
      }
    }
  } catch { /* non-fatal */ }

  // ── 7. Dizziness + Nausea (medication side effect) ──
  if (data.symptoms.includes('Dizziness') && data.symptoms.includes('Nausea')) {
    return { severity: 'LOW', message: `ℹ️ LOW: Dizziness and nausea reported. Likely medication side effect. Review at next check-in. Advise patient to stay hydrated and rise slowly.` };
  }

  // ── 8. Temperature drop below normal (hypothermia risk) ──
  if (temperature && temperature < 36.0) {
    return { severity: 'HIGH', message: `⚠️ HIGH: Temperature ${temperature}°C is below normal range (36.1°C). Hypothermia risk or inaccurate reading — verify and assess.` };
  }

  return null;
}

// ─── Deduplication — avoid repeat alerts within 6 hours ──────────────────────

async function isDuplicate(patientId: string, severity: AlertSeverity, messagePrefix: string): Promise<boolean> {
  const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000);
  const existing = await prisma.alert.findFirst({
    where: {
      patientId,
      severity,
      isResolved: false,
      createdAt: { gte: sixHoursAgo },
      message: { startsWith: messagePrefix.slice(0, 30) },
    },
  });
  return !!existing;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function evaluateCheckIn(data: CheckInData): Promise<AlertResult | null> {
  const { patientId, checkInId } = data;

  // Fetch last 5 check-ins for trend analysis
  const recent = await prisma.checkIn.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    skip: 1, // skip the one just submitted
  });

  // Run immediate threshold check first
  let alert = evaluateImmediate(data);

  // If no immediate alert, run trend analysis
  if (!alert) {
    alert = await evaluateTrends(data, recent);
  }

  if (!alert) return null;

  // Deduplicate
  if (await isDuplicate(patientId, alert.severity, alert.message)) return null;

  await createAlert(patientId, alert, checkInId);
  return alert;
}

async function createAlert(patientId: string, alert: AlertResult, checkInId?: string): Promise<void> {
  await prisma.alert.create({
    data: {
      patientId,
      checkInId: checkInId ?? null,
      severity: alert.severity as any,
      message: alert.message,
    },
  });
  console.log(`🔔 Alert created [${alert.severity}] for patient ${patientId}`);
}
