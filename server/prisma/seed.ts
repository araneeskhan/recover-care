import { PrismaClient, Role, StaffRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RecoverCare database...');

  // Clean existing data
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

  // Create patient user - Sarah Chen
  const patientUser = await prisma.user.create({
    data: {
      email: 'sarah.chen@email.com',
      password: hashedPassword,
      role: Role.PATIENT,
    },
  });

  // Create doctor user - Dr. Aarav Patel
  const doctorUser = await prisma.user.create({
    data: {
      email: 'dr.patel@mercygeneral.com',
      password: hashedPassword,
      role: Role.DOCTOR,
    },
  });

  // Create nurse user - Émilie Laurent
  const nurseUser = await prisma.user.create({
    data: {
      email: 'emilie.laurent@mercygeneral.com',
      password: hashedPassword,
      role: Role.NURSE,
    },
  });

  // Create Patient profile
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

  // Create Staff profiles
  const doctor = await prisma.staff.create({
    data: {
      userId: doctorUser.id,
      firstName: 'Aarav',
      lastName: 'Patel',
      staffRole: StaffRole.SURGEON,
      specialty: 'General Surgery',
    },
  });

  const nurse = await prisma.staff.create({
    data: {
      userId: nurseUser.id,
      firstName: 'Émilie',
      lastName: 'Laurent',
      staffRole: StaffRole.NURSE,
      specialty: 'Post-op Care',
    },
  });

  // Assign care team
  await prisma.careTeamAssignment.createMany({
    data: [
      { patientId: patient.id, staffId: doctor.id },
      { patientId: patient.id, staffId: nurse.id },
    ],
  });

  // Create Medications
  const now = new Date();
  const amoxicillinNext = new Date(now);
  amoxicillinNext.setHours(14, 0, 0, 0);

  const amoxicillin = await prisma.medication.create({
    data: {
      patientId: patient.id,
      name: 'Amoxicillin',
      dosage: '500 mg',
      frequency: '3× daily · with food',
      instructions: 'Take with food. Complete full course.',
      totalDoses: 21,
      takenDoses: 8,
      isActive: true,
      nextDoseAt: amoxicillinNext,
    },
  });

  await prisma.medication.create({
    data: {
      patientId: patient.id,
      name: 'Ibuprofen',
      dosage: '400 mg',
      frequency: 'Every 6h as needed',
      instructions: 'Take as needed for pain. Do not exceed 4 doses per day.',
      totalDoses: 30,
      takenDoses: 12,
      isActive: true,
      nextDoseAt: null,
    },
  });

  const pantoprazole = await prisma.medication.create({
    data: {
      patientId: patient.id,
      name: 'Pantoprazole',
      dosage: '40 mg',
      frequency: 'Once daily · morning',
      instructions: 'Take in the morning before breakfast.',
      totalDoses: 14,
      takenDoses: 5,
      isActive: true,
      nextDoseAt: new Date(new Date().setHours(8, 0, 0, 0)),
    },
  });

  // Add medication logs for Pantoprazole (taken today)
  const todayMorning = new Date();
  todayMorning.setHours(8, 5, 0, 0);
  await prisma.medicationLog.create({
    data: {
      medicationId: pantoprazole.id,
      takenAt: todayMorning,
    },
  });

  // Create past check-ins
  for (let day = 1; day <= 4; day++) {
    const checkDate = new Date('2026-05-02');
    checkDate.setDate(checkDate.getDate() + day);
    checkDate.setHours(8, 0, 0, 0);

    await prisma.checkIn.create({
      data: {
        patientId: patient.id,
        painLevel: Math.max(1, 7 - day),
        temperature: 36.8 + (Math.random() * 0.8),
        symptoms: day <= 2 ? ['Fatigue', 'Swelling'] : ['Fatigue'],
        notes: day === 1
          ? 'First day home. Feeling groggy from anesthesia.'
          : day === 2
          ? 'Better today. Able to walk around the house.'
          : day === 3
          ? 'Swelling going down. Slept well.'
          : 'Slept better last night. Incision area felt tight when I got out of bed but eased after walking.',
        mood: day <= 2 ? 'fair' : 'good',
        createdAt: checkDate,
      },
    });
  }

  // Create Messages with Nurse Émilie
  const today = new Date();
  today.setHours(8, 2, 0, 0);

  const messageData = [
    {
      content: 'Good morning, Sarah! How are you feeling today?',
      senderId: nurse.id,
      senderType: Role.NURSE,
      time: new Date(new Date(today).setHours(8, 2, 0, 0)),
      isRead: true,
    },
    {
      content: 'Morning Émilie. Pain is around a 3 — much better than yesterday.',
      senderId: patient.id,
      senderType: Role.PATIENT,
      time: new Date(new Date(today).setHours(8, 14, 0, 0)),
      isRead: true,
    },
    {
      content: "That's wonderful progress 💚 Are you keeping up with the walking exercises?",
      senderId: nurse.id,
      senderType: Role.NURSE,
      time: new Date(new Date(today).setHours(8, 15, 0, 0)),
      isRead: true,
    },
    {
      content: 'Yes, two short walks already. Incision looks a bit pink near the top — should I be worried?',
      senderId: patient.id,
      senderType: Role.PATIENT,
      time: new Date(new Date(today).setHours(8, 22, 0, 0)),
      isRead: true,
    },
    {
      content: "Some pinkness is normal. Please send a photo through the secure upload and I'll review with Dr. Patel before noon.",
      senderId: nurse.id,
      senderType: Role.NURSE,
      time: new Date(new Date(today).setHours(8, 24, 0, 0)),
      isRead: true,
    },
  ];

  for (const msg of messageData) {
    await prisma.message.create({
      data: {
        patientId: patient.id,
        staffId: nurse.id,
        content: msg.content,
        senderId: msg.senderId,
        senderType: msg.senderType,
        isRead: msg.isRead,
        createdAt: msg.time,
      },
    });
  }

  // Create Appointments
  const fridayDate = new Date();
  // Find next Friday
  const daysUntilFriday = (5 - fridayDate.getDay() + 7) % 7 || 7;
  fridayDate.setDate(fridayDate.getDate() + daysUntilFriday);
  fridayDate.setHours(10, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      title: 'Call with Dr. Patel',
      description: 'Post-op review · 15 min',
      dateTime: fridayDate,
      duration: 15,
    },
  });

  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 10);
  followUpDate.setHours(14, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      title: 'Follow-up Visit',
      description: 'In-person checkup at Mercy General',
      dateTime: followUpDate,
      duration: 30,
    },
  });

  // Create Wound Photos
  for (let day = 1; day <= 4; day++) {
    const photoDate = new Date('2026-05-02');
    photoDate.setDate(photoDate.getDate() + day);
    photoDate.setHours(9, 0, 0, 0);

    await prisma.woundPhoto.create({
      data: {
        patientId: patient.id,
        photoUri: `local://wound_day_${day}.jpg`,
        caption: day === 1
          ? 'Day 1 post-op — bandage just removed, slight redness around incision'
          : day === 2
          ? 'Day 2 — swelling going down, cleaned with saline'
          : day === 3
          ? 'Day 3 — looking much better, no discharge'
          : 'Day 4 — healing nicely, pinkness fading',
        createdAt: photoDate,
      },
    });
  }

  console.log('✅ Seed data created successfully!');
  console.log(`   Patient: Sarah Chen (${patientUser.email})`);
  console.log(`   Doctor: Dr. Aarav Patel (${doctorUser.email})`);
  console.log(`   Nurse: Émilie Laurent (${nurseUser.email})`);
  console.log(`   Password for all: password123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
