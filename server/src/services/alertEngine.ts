import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface CheckInData {
  patientId: string;
  checkInId?: string;
  painLevel: number;
  temperature: number | null;
  symptoms: string[];
}

interface AlertResult {
  severity: AlertSeverity;
  message: string;
}

export async function evaluateCheckIn(data: CheckInData): Promise<AlertResult | null> {
  const { patientId, checkInId, painLevel, temperature, symptoms } = data;

  if (painLevel >= 8 && temperature && temperature > 38.5) {
    const alert: AlertResult = { severity: 'CRITICAL', message: `🚨 CRITICAL: Patient reports pain level ${painLevel}/10 with fever ${temperature}°C. Possible post-surgical infection or complication. Immediate medical review required.` };
    await createAlert(patientId, alert, checkInId);
    return alert;
  }

  if (painLevel >= 8) {
    const alert: AlertResult = { severity: 'HIGH', message: `⚠️ HIGH: Patient reports severe pain level ${painLevel}/10. Review pain management protocol.` };
    await createAlert(patientId, alert, checkInId);
    return alert;
  }

  if (temperature && temperature > 38.5) {
    const alert: AlertResult = { severity: 'HIGH', message: `⚠️ HIGH: Patient has elevated temperature ${temperature}°C. Monitor for signs of infection.` };
    await createAlert(patientId, alert, checkInId);
    return alert;
  }

  if (temperature && temperature > 38.0 && painLevel >= 6) {
    const alert: AlertResult = { severity: 'HIGH', message: `⚠️ HIGH: Moderate fever ${temperature}°C combined with pain ${painLevel}/10. Warrants clinical review.` };
    await createAlert(patientId, alert, checkInId);
    return alert;
  }

  if (symptoms.length >= 3) {
    const alert: AlertResult = { severity: 'MEDIUM', message: `📋 MEDIUM: Patient reports ${symptoms.length} symptoms: ${symptoms.join(', ')}. Increased monitoring recommended.` };
    await createAlert(patientId, alert, checkInId);
    return alert;
  }

  const previousCheckIn = await prisma.checkIn.findFirst({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    skip: 1,
  });

  if (previousCheckIn && painLevel - previousCheckIn.painLevel >= 3) {
    const alert: AlertResult = { severity: 'MEDIUM', message: `📋 MEDIUM: Pain increased from ${previousCheckIn.painLevel} to ${painLevel} since last check-in. Unexpected pain escalation.` };
    await createAlert(patientId, alert, checkInId);
    return alert;
  }

  if (symptoms.includes('Dizziness') && symptoms.includes('Nausea')) {
    const alert: AlertResult = { severity: 'LOW', message: `ℹ️ LOW: Patient reports dizziness and nausea. May be medication side effect. Review at next check-in.` };
    await createAlert(patientId, alert, checkInId);
    return alert;
  }

  return null;
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
