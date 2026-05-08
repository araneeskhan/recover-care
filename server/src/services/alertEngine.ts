import { PrismaClient, AlertSeverity } from '@prisma/client';

const prisma = new PrismaClient();

interface CheckInData {
  patientId: string;
  painLevel: number;
  temperature: number | null;
  symptoms: string[];
}

interface AlertResult {
  severity: AlertSeverity;
  message: string;
}

/**
 * Intelligent Alert Engine
 * Analyzes check-in data and generates alerts based on symptom combinations.
 * 
 * Rules:
 * - CRITICAL: Pain ≥ 8 AND fever > 38.5°C
 * - HIGH: Pain ≥ 8 OR fever > 38.5°C OR (fever > 38°C AND pain ≥ 6)
 * - MEDIUM: 3+ symptoms reported OR pain increased by 3+ from previous check-in
 * - LOW: Specific concerning symptoms (dizziness + nausea combo)
 */
export async function evaluateCheckIn(data: CheckInData): Promise<AlertResult | null> {
  const { patientId, painLevel, temperature, symptoms } = data;

  // CRITICAL: High pain + high fever = possible post-surgical infection
  if (painLevel >= 8 && temperature && temperature > 38.5) {
    const alert = {
      severity: AlertSeverity.CRITICAL,
      message: `🚨 CRITICAL: Patient reports pain level ${painLevel}/10 with fever ${temperature}°C. Possible post-surgical infection or complication. Immediate medical review required.`,
    };
    await createAlert(patientId, alert);
    return alert;
  }

  // HIGH: Either very high pain or high fever alone
  if (painLevel >= 8) {
    const alert = {
      severity: AlertSeverity.HIGH,
      message: `⚠️ HIGH: Patient reports severe pain level ${painLevel}/10. Review pain management protocol.`,
    };
    await createAlert(patientId, alert);
    return alert;
  }

  if (temperature && temperature > 38.5) {
    const alert = {
      severity: AlertSeverity.HIGH,
      message: `⚠️ HIGH: Patient has elevated temperature ${temperature}°C. Monitor for signs of infection.`,
    };
    await createAlert(patientId, alert);
    return alert;
  }

  if (temperature && temperature > 38.0 && painLevel >= 6) {
    const alert = {
      severity: AlertSeverity.HIGH,
      message: `⚠️ HIGH: Moderate fever ${temperature}°C combined with pain ${painLevel}/10. Warrants clinical review.`,
    };
    await createAlert(patientId, alert);
    return alert;
  }

  // MEDIUM: Multiple symptoms or significant pain increase
  if (symptoms.length >= 3) {
    const alert = {
      severity: AlertSeverity.MEDIUM,
      message: `📋 MEDIUM: Patient reports ${symptoms.length} symptoms: ${symptoms.join(', ')}. Increased monitoring recommended.`,
    };
    await createAlert(patientId, alert);
    return alert;
  }

  // Check for pain increase vs. previous check-in
  const previousCheckIn = await prisma.checkIn.findFirst({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    skip: 1,
  });

  if (previousCheckIn && painLevel - previousCheckIn.painLevel >= 3) {
    const alert = {
      severity: AlertSeverity.MEDIUM,
      message: `📋 MEDIUM: Pain increased from ${previousCheckIn.painLevel} to ${painLevel} since last check-in. Unexpected pain escalation.`,
    };
    await createAlert(patientId, alert);
    return alert;
  }

  // LOW: Concerning symptom combinations
  if (symptoms.includes('Dizziness') && symptoms.includes('Nausea')) {
    const alert = {
      severity: AlertSeverity.LOW,
      message: `ℹ️ LOW: Patient reports dizziness and nausea. May be medication side effect. Review at next check-in.`,
    };
    await createAlert(patientId, alert);
    return alert;
  }

  return null;
}

async function createAlert(patientId: string, alert: AlertResult): Promise<void> {
  await prisma.alert.create({
    data: {
      patientId,
      severity: alert.severity,
      message: alert.message,
    },
  });
  console.log(`🔔 Alert created [${alert.severity}] for patient ${patientId}`);
}
