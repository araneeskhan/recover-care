import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RecoverCare database...');

  await prisma.woundPhoto.deleteMany();
  await prisma.medicationLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.message.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.careTeamAssignment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  const patientUser = await prisma.user.create({
    data: { email: 'sarah.chen@email.com', password: hashedPassword, role: 'PATIENT' as any },
  });
  const doctorUser = await prisma.user.create({
    data: { email: 'dr.patel@mercygeneral.com', password: hashedPassword, role: 'DOCTOR' as any },
  });
  const nurseUser = await prisma.user.create({
    data: { email: 'emilie.laurent@mercygeneral.com', password: hashedPassword, role: 'NURSE' as any },
  });

  const patient = await prisma.patient.create({
    data: {
      userId: patientUser.id,
      firstName: 'Sarah',
      lastName: 'Chen',
      mrn: '4729-883',
      age: 42,
      phone: '+1 (555) 234-5678',
      surgeryType: 'Laparoscopic Cholecystectomy',
      surgeryDate: new Date('2026-05-02'),
      hospital: 'Mercy General',
      recoveryDays: 14,
      emergencyContactName: 'David Chen',
      emergencyContactPhone: '+1 (555) 987-6543',
      bloodType: 'A+',
      allergies: 'Penicillin',
      address: '450 Riverside Drive, Apt 12B, New York',
    },
  });

  const doctor = await prisma.staff.create({
    data: {
      userId: doctorUser.id,
      firstName: 'Aarav',
      lastName: 'Patel',
      staffRole: 'SURGEON' as any,
      specialty: 'General Surgery',
      department: 'Surgery',
      licenseNumber: 'MD-44821-NY',
      phone: '+1 (555) 100-2000',
    },
  });

  const nurse = await prisma.staff.create({
    data: {
      userId: nurseUser.id,
      firstName: 'Émilie',
      lastName: 'Laurent',
      staffRole: 'NURSE' as any,
      specialty: 'Post-op Care',
      department: 'Surgical Recovery',
      licenseNumber: 'RN-98234-NY',
      phone: '+1 (555) 100-3000',
    },
  });

  await prisma.careTeamAssignment.createMany({
    data: [
      { patientId: patient.id, staffId: doctor.id },
      { patientId: patient.id, staffId: nurse.id },
    ],
  });

  // Medications
  const now = new Date();
  const amoxNext = new Date(now); amoxNext.setHours(14, 0, 0, 0);

  await prisma.medication.create({
    data: {
      patientId: patient.id, name: 'Amoxicillin', dosage: '500 mg',
      frequency: '3× daily · with food',
      instructions: 'Take with food. Complete full course.',
      totalDoses: 21, takenDoses: 8, isActive: true, nextDoseAt: amoxNext,
    },
  });

  await prisma.medication.create({
    data: {
      patientId: patient.id, name: 'Ibuprofen', dosage: '400 mg',
      frequency: 'Every 6h as needed',
      instructions: 'Take as needed for pain. Do not exceed 4 doses per day.',
      totalDoses: 30, takenDoses: 12, isActive: true,
    },
  });

  const panto = await prisma.medication.create({
    data: {
      patientId: patient.id, name: 'Pantoprazole', dosage: '40 mg',
      frequency: 'Once daily · morning',
      instructions: 'Take in the morning before breakfast.',
      totalDoses: 14, takenDoses: 5, isActive: true,
      nextDoseAt: new Date(new Date().setHours(8, 0, 0, 0)),
    },
  });

  const todayMorning = new Date(); todayMorning.setHours(8, 5, 0, 0);
  await prisma.medicationLog.create({ data: { medicationId: panto.id, takenAt: todayMorning } });

  // Check-ins (4 days)
  const checkInNotes = [
    'First day home. Feeling groggy from anesthesia.',
    'Better today. Able to walk around the house.',
    'Swelling going down. Slept well.',
    'Slept better last night. Incision area felt tight when I got out of bed but eased after walking.',
  ];
  const checkInTemps = [37.4, 37.2, 37.0, 36.9];
  const checkIns: any[] = [];
  for (let day = 1; day <= 4; day++) {
    const checkDate = new Date('2026-05-02');
    checkDate.setDate(checkDate.getDate() + day);
    checkDate.setHours(8, 0, 0, 0);

    const ci = await prisma.checkIn.create({
      data: {
        patientId: patient.id,
        painLevel: Math.max(1, 7 - day),
        temperature: checkInTemps[day - 1],
        symptoms: day <= 2 ? ['Fatigue', 'Swelling'] : ['Fatigue'],
        notes: checkInNotes[day - 1],
        mood: day <= 2 ? 'fair' : 'good',
        staffNotes: day === 2 ? 'Patient progressing well. Continue current pain management.' : null,
        createdAt: checkDate,
      },
    });
    checkIns.push(ci);
  }

  // Alerts (resolved + active)
  await prisma.alert.create({
    data: {
      patientId: patient.id,
      checkInId: checkIns[0].id,
      severity: 'HIGH' as any,
      message: '⚠️ HIGH: Patient reports severe pain level 6/10. Review pain management protocol.',
      isResolved: true,
      resolvedById: nurse.id,
      resolvedAt: new Date('2026-05-04T10:30:00'),
      resolutionNote: 'Patient advised to increase ibuprofen frequency and rest. Will monitor.',
    },
  });

  await prisma.alert.create({
    data: {
      patientId: patient.id,
      checkInId: checkIns[0].id,
      severity: 'LOW' as any,
      message: 'ℹ️ LOW: Temperature slightly elevated at 37.4°C. Continue monitoring.',
      isResolved: true,
      resolvedById: nurse.id,
      resolvedAt: new Date('2026-05-03T12:00:00'),
      resolutionNote: 'Temperature within acceptable post-operative range. Patient advised to rest.',
    },
  });

  await prisma.alert.create({
    data: {
      patientId: patient.id,
      checkInId: checkIns[1].id,
      severity: 'MEDIUM' as any,
      message: '📋 MEDIUM: Patient reports 2 symptoms: Fatigue, Swelling. Increased monitoring recommended.',
      isResolved: false,
    },
  });

  // Messages
  const today = new Date();
  const msgData = [
    { content: 'Good morning, Sarah! How are you feeling today?', senderId: nurse.id, senderType: 'NURSE', hrs: 8, min: 2, isRead: true },
    { content: 'Morning Émilie. Pain is around a 3 — much better than yesterday.', senderId: patient.id, senderType: 'PATIENT', hrs: 8, min: 14, isRead: true },
    { content: "That's wonderful progress 💚 Are you keeping up with the walking exercises?", senderId: nurse.id, senderType: 'NURSE', hrs: 8, min: 15, isRead: true },
    { content: 'Yes, two short walks already. Incision looks a bit pink near the top — should I be worried?', senderId: patient.id, senderType: 'PATIENT', hrs: 8, min: 22, isRead: true },
    { content: "Some pinkness is normal. Please send a photo through the secure upload and I'll review with Dr. Patel before noon.", senderId: nurse.id, senderType: 'NURSE', hrs: 8, min: 24, isRead: false },
  ];

  for (const m of msgData) {
    const t = new Date(today);
    t.setHours(m.hrs, m.min, 0, 0);
    await prisma.message.create({
      data: {
        patientId: patient.id, staffId: nurse.id,
        content: m.content, senderId: m.senderId,
        senderType: m.senderType as any,
        isRead: m.isRead, createdAt: t,
      },
    });
  }

  // Appointments
  const fridayDate = new Date();
  const daysToFriday = (5 - fridayDate.getDay() + 7) % 7 || 7;
  fridayDate.setDate(fridayDate.getDate() + daysToFriday);
  fridayDate.setHours(10, 0, 0, 0);

  await prisma.appointment.create({
    data: { patientId: patient.id, title: 'Call with Dr. Patel', description: 'Post-op review · 15 min', dateTime: fridayDate, duration: 15 },
  });

  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 10);
  followUpDate.setHours(14, 0, 0, 0);

  await prisma.appointment.create({
    data: { patientId: patient.id, title: 'Follow-up Visit', description: 'In-person checkup at Mercy General', dateTime: followUpDate, duration: 30 },
  });

  const labDate = new Date();
  labDate.setDate(labDate.getDate() + 12);
  labDate.setHours(9, 0, 0, 0);

  await prisma.appointment.create({
    data: { patientId: patient.id, title: 'Lab Work', description: 'Blood panel & wound culture', dateTime: labDate, duration: 20 },
  });

  // Wound Photos
  for (let day = 1; day <= 4; day++) {
    const photoDate = new Date('2026-05-02');
    photoDate.setDate(photoDate.getDate() + day);
    photoDate.setHours(9, 0, 0, 0);

    const captions = [
      'Day 1 post-op — bandage just removed, slight redness around incision',
      'Day 2 — swelling going down, cleaned with saline',
      'Day 3 — looking much better, no discharge',
      'Day 4 — healing nicely, pinkness fading',
    ];
    await prisma.woundPhoto.create({
      data: { patientId: patient.id, photoUri: `local://wound_day_${day}.jpg`, caption: captions[day - 1], createdAt: photoDate },
    });
  }

  console.log('✅ Seed data created!');
  console.log('   Patient:  sarah.chen@email.com         / password123');
  console.log('   Doctor:   dr.patel@mercygeneral.com    / password123');
  console.log('   Nurse:    emilie.laurent@mercygeneral.com / password123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
