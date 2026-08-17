import { PrismaClient, PaymentMethod, Role } from '@prisma/client';
import { numberToWords } from '../lib/i18n';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding UtsavHisab demo dataset...');

  const rahul = await prisma.user.upsert({
    where: { email: 'rahul.admin@utsavhisab.com' },
    update: {},
    create: {
      name: 'राहुल शांताराम पाटील (अध्यक्ष)',
      email: 'rahul.admin@utsavhisab.com',
      phone: '9822012345',
      preferredLang: 'mr'
    }
  });

  const sachin = await prisma.user.upsert({
    where: { email: 'sachin.treasurer@utsavhisab.com' },
    update: {},
    create: {
      name: 'सचिन वसंतराव देशपांडे (खजिनदार)',
      email: 'sachin.treasurer@utsavhisab.com',
      phone: '9822098765',
      preferredLang: 'mr'
    }
  });

  const mandal = await prisma.mandal.upsert({
    where: { joinCode: '482916' },
    update: {},
    create: {
      name: 'शिवशक्ती सार्वजनिक गणेशोत्सव मंडळ',
      shortName: 'SSGM',
      joinCode: '482916',
      address: 'टिळक रोड, शुक्रवार पेठ',
      city: 'पुणे',
      district: 'पुणे',
      state: 'महाराष्ट्र',
      pincode: '411002',
      contactNumber: '9822012345',
      email: 'contact@shivshaktiganesh.org',
      defaultLang: 'mr'
    }
  });

  await prisma.mandalMember.createMany({
    data: [
      { mandalId: mandal.id, userId: rahul.id, role: Role.PRESIDENT },
      { mandalId: mandal.id, userId: sachin.id, role: Role.TREASURER }
    ],
    skipDuplicates: true
  });

  const festival = await prisma.festival.create({
    data: {
      mandalId: mandal.id,
      name: 'गणेशोत्सव २०२६',
      financialYear: '2026-2027',
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-08-31'),
      budget: 250000.00,
      isActive: true
    }
  });

  await prisma.account.createMany({
    data: [
      { mandalId: mandal.id, name: 'रोख खाते (Cash)', type: PaymentMethod.CASH, openingBalance: 5000, currentBalance: 25000 },
      { mandalId: mandal.id, name: 'SBI चालू खाते', type: PaymentMethod.BANK, openingBalance: 20000, currentBalance: 45000 },
      { mandalId: mandal.id, name: 'मंडळ मुख्य UPI QR', type: PaymentMethod.UPI, openingBalance: 0, currentBalance: 8666 }
    ]
  });

  const catVargani = await prisma.incomeCategory.create({
    data: { mandalId: mandal.id, name: 'वर्गणी (Vargani)', sortOrder: 1 }
  });

  const area = await prisma.area.create({
    data: { mandalId: mandal.id, name: 'लेन क्र. १ - मुख्य रस्ता' }
  });

  await prisma.household.createMany({
    data: [
      { areaId: area.id, houseNo: '१०१', familyName: 'पाटील परिवार', targetAmount: 501, collected: 501, status: 'COLLECTED' },
      { areaId: area.id, houseNo: '१०२', familyName: 'देशमुख निवास', targetAmount: 1001, collected: 0, status: 'PENDING' }
    ]
  });

  console.log('Demo Mandal, Festival, Ledgers, and Households seeded successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
