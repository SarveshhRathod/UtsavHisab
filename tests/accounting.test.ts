import { AccountingService } from '../server/services/accounting.service';
import { PrismaClient, PaymentMethod, Role } from '@prisma/client';

const prisma = new PrismaClient();

describe('UtsavHisab Production Accounting Engine Verification', () => {
  let mandalId: string;
  let festivalId: string;
  let cashAccountId: string;
  let bankAccountId: string;
  let collectorId: string;
  let categoryId: string;

  beforeAll(async () => {
    // Setup clean test mandal & accounts
    const mandal = await prisma.mandal.create({
      data: {
        name: 'Test Accounting Mandal',
        shortName: 'TAM',
        joinCode: String(Math.floor(100000 + Math.random() * 900000)),
        address: 'MG Road',
        city: 'Pune',
        district: 'Pune',
        pincode: '411001',
        contactNumber: '9999999999'
      }
    });
    mandalId = mandal.id;

    const user = await prisma.user.create({
      data: { name: 'Test Collector', email: `test-${Date.now()}@utsavhisab.com` }
    });
    collectorId = user.id;

    const festival = await prisma.festival.create({
      data: {
        mandalId,
        name: 'Test Utsav 2026',
        financialYear: '2026-2027',
        startDate: new Date(),
        endDate: new Date()
      }
    });
    festivalId = festival.id;

    const cat = await prisma.incomeCategory.create({
      data: { mandalId, name: 'General Vargani' }
    });
    categoryId = cat.id;

    const cashAcc = await prisma.account.create({
      data: { mandalId, name: 'Cash Account', type: PaymentMethod.CASH, openingBalance: 5000, currentBalance: 5000 }
    });
    cashAccountId = cashAcc.id;

    const bankAcc = await prisma.account.create({
      data: { mandalId, name: 'SBI Account', type: PaymentMethod.BANK, openingBalance: 0, currentBalance: 0 }
    });
    bankAccountId = bankAcc.id;
  });

  afterAll(async () => {
    await prisma.mandal.delete({ where: { id: mandalId } });
    await prisma.user.delete({ where: { id: collectorId } });
    await prisma.$disconnect();
  });

  test('TC-01: Income creation increments cash account atomically and generates sequential receipt', async () => {
    const result = await AccountingService.recordIncome({
      mandalId,
      festivalId,
      categoryId,
      amount: 10000,
      donorName: 'Santosh Shinde',
      paymentMethod: PaymentMethod.CASH,
      collectorId
    });

    expect(Number(result.amount)).toBe(10000);
    expect(result.receipt).toBeDefined();
    expect(result.receipt?.sequenceNumber).toBe(1);

    const cashAcc = await prisma.account.findUnique({ where: { id: cashAccountId } });
    expect(Number(cashAcc?.currentBalance)).toBe(15000); // 5000 opening + 10000 income
  });

  test('TC-02: Inter-Account Transfer preserves total equity without distorting festival income', async () => {
    await AccountingService.transferFunds({
      mandalId,
      festivalId,
      fromAccountId: cashAccountId,
      toAccountId: bankAccountId,
      amount: 3000,
      userId: collectorId
    });

    const cashAcc = await prisma.account.findUnique({ where: { id: cashAccountId } });
    const bankAcc = await prisma.account.findUnique({ where: { id: bankAccountId } });

    expect(Number(cashAcc?.currentBalance)).toBe(12000); // 15000 - 3000
    expect(Number(bankAcc?.currentBalance)).toBe(3000);   // 0 + 3000

    const summary = await AccountingService.getFestivalFinancialSummary(mandalId, festivalId);
    expect(summary.totalIncome).toBe(10000); // Transfer did not create fake income
  });

  test('TC-03: Concurrency Safety: 10 Parallel Receipts maintain atomic unique sequencing', async () => {
    const promises = Array.from({ length: 10 }).map((_, idx) =>
      AccountingService.recordIncome({
        mandalId,
        festivalId,
        categoryId,
        amount: 100 + idx,
        donorName: `Parallel Donor ${idx}`,
        paymentMethod: PaymentMethod.CASH,
        collectorId
      })
    );

    const receipts = await Promise.all(promises);
    const seqNumbers = receipts.map(r => r.receipt!.sequenceNumber);
    const uniqueSeqs = new Set(seqNumbers);

    expect(uniqueSeqs.size).toBe(10);
  });
});
