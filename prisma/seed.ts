import { PrismaClient, PaymentMethod, Role } from '@prisma/client';
import { numberToWords } from '../lib/i18n';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production-grade MandalSetu demo dataset...');

  // 1. Create Demo Super Admin & Users
  const rahul = await prisma.user.upsert({
    where: { email: 'rahul.admin@mandalsetu.com' },
    update: {},
    create: {
      name: 'राहुल शांताराम पाटील (अध्यक्ष)',
      email: 'rahul.admin@mandalsetu.com',
      phone: '9822012345',
      preferredLang: 'mr'
    }
  });

  const sachin = await prisma.user.upsert({
    where: { email: 'sachin.treasurer@mandalsetu.com' },
    update: {},
    create: {
      name: 'सचिन वसंतराव देशपांडे (खजिनदार)',
      email: 'sachin.treasurer@mandalsetu.com',
      phone: '9822098765',
      preferredLang: 'mr'
    }
  });

  // 2. Create Demo Mandal
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

  // 3. Assign Membership Roles
  await prisma.mandalMember.createMany({
    data: [
      { mandalId: mandal.id, userId: rahul.id, role: Role.PRESIDENT },
      { mandalId: mandal.id, userId: sachin.id, role: Role.TREASURER }
    ],
    skipDuplicates: true
  });

  // 4. Create Active Festival
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

  // 5. Create Accounts
  const cashAcc = await prisma.account.create({
    data: { mandalId: mandal.id, name: 'रोख खाते (Cash)', type: PaymentMethod.CASH, openingBalance: 5000, currentBalance: 25000 }
  });
  const bankAcc = await prisma.account.create({
    data: { mandalId: mandal.id, name: 'SBI चालू खाते', type: PaymentMethod.BANK, openingBalance: 20000, currentBalance: 45000 }
  });
  const upiAcc = await prisma.account.create({
    data: { mandalId: mandal.id, name: 'मंडळ मुख्य UPI QR', type: PaymentMethod.UPI, openingBalance: 0, currentBalance: 8666 }
  });

  // 6. Create Income & Expense Categories
  const catVargani = await prisma.incomeCategory.create({
    data: { mandalId: mandal.id, name: 'वर्गणी (Vargani)', sortOrder: 1 }
  });
  const catDonation = await prisma.incomeCategory.create({
    data: { mandalId: mandal.id, name: 'देणगी (Donation)', sortOrder: 2 }
  });
  const catDecor = await prisma.expenseCategory.create({
    data: { mandalId: mandal.id, name: 'मंडप व सजावट (Mandap & Decor)', sortOrder: 1 }
  });

  // 7. Seed Sample Income Transactions & Receipts
  const sampleDonors = [
    { name: 'विकास मोरे', amount: 501, method: PaymentMethod.CASH },
    { name: 'सुहास कुलकर्णी', amount: 2100, method: PaymentMethod.UPI },
    { name: 'गजानन शेठ ट्रेडर्स', amount: 11000, method: PaymentMethod.BANK },
  ];

  let seq = 1;
  for (const item of sampleDonors) {
    const tx = await prisma.transaction.create({
      data: { mandalId: mandal.id, festivalId: festival.id, type: 'INCOME', amount: item.amount }
    });

    const income = await prisma.income.create({
      data: {
        transactionId: tx.id,
        festivalId: festival.id,
        categoryId: catVargani.id,
        donorName: item.name,
        amount: item.amount,
        paymentMethod: item.method,
        collectorId: sachin.id
      }
    });

    await prisma.receipt.create({
      data: {
        incomeId: income.id,
        festivalId: festival.id,
        receiptNumber: `SSGM-2026-${String(seq).padStart(6, '0')}`,
        sequenceNumber: seq,
        donorName: item.name,
        amount: item.amount,
        amountInWords: numberToWords(item.amount, 'mr')
      }
    });
    seq++;
  }

  console.log('Database seeding successfully completed with sample mandal data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
