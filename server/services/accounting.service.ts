import { PrismaClient, PaymentMethod, Role, Prisma } from '@prisma/client';
import { numberToWords } from '@/lib/i18n';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface RecordIncomeInput {
  mandalId: string;
  festivalId: string;
  categoryId: string;
  amount: number;
  donorName: string;
  donorPhone?: string;
  paymentMethod: PaymentMethod;
  collectorId: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface RecordExpenseInput {
  mandalId: string;
  festivalId: string;
  categoryId: string;
  amount: number;
  payeeName: string;
  paymentMethod: PaymentMethod;
  createdById: string;
  billNumber?: string;
  attachmentUrl?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface TransferFundsInput {
  mandalId: string;
  festivalId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  userId: string;
  notes?: string;
}

export class AccountingService {
  /**
   * Concurrency-safe atomic receipt generator using counter table
   */
  private static async getNextReceiptNumber(tx: Prisma.TransactionClient, mandalId: string, festivalId: string) {
    const template = await tx.receiptTemplate.findUnique({ where: { mandalId } });
    const prefix = template?.prefix || 'UH';

    const counter = await tx.receiptCounter.upsert({
      where: { mandalId },
      update: { currentVal: { increment: 1 } },
      create: { mandalId, currentVal: 1 }
    });

    const year = new Date().getFullYear();
    const padded = String(counter.currentVal).padStart(6, '0');
    return {
      receiptNumber: `${prefix}-${year}-${padded}`,
      sequenceNumber: counter.currentVal
    };
  }

  /**
   * Atomic Income recording with idempotency, double-entry ledger, donor aggregation & receipt generation
   */
  static async recordIncome(input: RecordIncomeInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Idempotency Check
      if (input.idempotencyKey) {
        const existingTx = await tx.transaction.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { income: { include: { receipt: true } } }
        });
        if (existingTx && existingTx.income) {
          return existingTx.income;
        }
      }

      // 2. Resolve Financial Account
      const account = await tx.account.findFirst({
        where: { mandalId: input.mandalId, type: input.paymentMethod, isActive: true }
      });

      if (!account) {
        throw new Error(`ACCOUNT_NOT_FOUND: Active ${input.paymentMethod} ledger account does not exist.`);
      }

      // 3. Upsert Donor Profile
      let donorId: string | undefined;
      if (input.donorPhone || input.donorName) {
        const donor = await tx.donor.findFirst({
          where: {
            mandalId: input.mandalId,
            ...(input.donorPhone ? { phone: input.donorPhone } : { name: input.donorName })
          }
        });

        if (donor) {
          donorId = donor.id;
          await tx.donor.update({
            where: { id: donor.id },
            data: {
              totalDonated: { increment: input.amount },
              donationCount: { increment: 1 },
              lastDonationAt: new Date()
            }
          });
        } else {
          const newDonor = await tx.donor.create({
            data: {
              mandalId: input.mandalId,
              name: input.donorName,
              phone: input.donorPhone,
              totalDonated: input.amount,
              donationCount: 1,
              lastDonationAt: new Date()
            }
          });
          donorId = newDonor.id;
        }
      }

      // 4. Create Master Financial Transaction
      const masterTx = await tx.transaction.create({
        data: {
          mandalId: input.mandalId,
          festivalId: input.festivalId,
          type: 'INCOME',
          amount: input.amount,
          idempotencyKey: input.idempotencyKey
        }
      });

      // 5. Update Account Balance & Record Ledger Debit
      const updatedBalance = Number(account.currentBalance) + Number(input.amount);
      await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: updatedBalance }
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: masterTx.id,
          accountId: account.id,
          debit: input.amount,
          credit: 0,
          balanceAfter: updatedBalance
        }
      });

      // 6. Create Income Record
      const income = await tx.income.create({
        data: {
          transactionId: masterTx.id,
          festivalId: input.festivalId,
          categoryId: input.categoryId,
          donorId,
          donorName: input.donorName,
          donorPhone: input.donorPhone,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          collectorId: input.collectorId,
          notes: input.notes
        }
      });

      // 7. Atomic Concurrency-Safe Receipt Generation
      const { receiptNumber, sequenceNumber } = await this.getNextReceiptNumber(tx, input.mandalId, input.festivalId);
      const shareToken = crypto.randomBytes(12).toString('hex');

      const receipt = await tx.receipt.create({
        data: {
          incomeId: income.id,
          festivalId: input.festivalId,
          receiptNumber,
          sequenceNumber,
          shareToken,
          donorName: input.donorName,
          amount: input.amount,
          amountInWords: numberToWords(Number(input.amount), 'mr')
        }
      });

      // 8. Create Immutable Audit Record
      await tx.auditLog.create({
        data: {
          mandalId: input.mandalId,
          userId: input.collectorId,
          action: 'INCOME_RECORDED',
          entity: 'Transaction',
          entityId: masterTx.id,
          after: { amount: input.amount, donor: input.donorName, receiptNumber }
        }
      });

      return { ...income, receipt };
    });
  }

  /**
   * Atomic Expense recording with dynamic approval thresholds & ledger rollback guards
   */
  static async recordExpense(input: RecordExpenseInput) {
    return await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existingTx = await tx.transaction.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { expense: true }
        });
        if (existingTx && existingTx.expense) return existingTx.expense;
      }

      // Check configured Mandal approval threshold
      const mandal = await tx.mandal.findUniqueOrThrow({ where: { id: input.mandalId } });
      const requiresApproval = Number(input.amount) >= Number(mandal.approvalLimit);
      const initialStatus = requiresApproval ? 'PENDING' : 'APPROVED';

      const account = await tx.account.findFirst({
        where: { mandalId: input.mandalId, type: input.paymentMethod, isActive: true }
      });

      if (!account) {
        throw new Error(`ACCOUNT_NOT_FOUND: No active ${input.paymentMethod} account configured to pay expense.`);
      }

      const masterTx = await tx.transaction.create({
        data: {
          mandalId: input.mandalId,
          festivalId: input.festivalId,
          type: 'EXPENSE',
          amount: input.amount,
          idempotencyKey: input.idempotencyKey
        }
      });

      const expense = await tx.expense.create({
        data: {
          transactionId: masterTx.id,
          festivalId: input.festivalId,
          categoryId: input.categoryId,
          payeeName: input.payeeName,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          status: initialStatus,
          billNumber: input.billNumber,
          attachmentUrl: input.attachmentUrl,
          createdById: input.createdById,
          notes: input.notes
        }
      });

      // Deduct balance immediately only if auto-approved
      if (initialStatus === 'APPROVED') {
        const updatedBalance = Number(account.currentBalance) - Number(input.amount);
        await tx.account.update({
          where: { id: account.id },
          data: { currentBalance: updatedBalance }
        });

        await tx.ledgerEntry.create({
          data: {
            transactionId: masterTx.id,
            accountId: account.id,
            debit: 0,
            credit: input.amount,
            balanceAfter: updatedBalance
          }
        });
      }

      await tx.auditLog.create({
        data: {
          mandalId: input.mandalId,
          userId: input.createdById,
          action: 'EXPENSE_RECORDED',
          entity: 'Expense',
          entityId: expense.id,
          after: { amount: input.amount, payee: input.payeeName, status: initialStatus }
        }
      });

      return expense;
    });
  }

  /**
   * Dual-entry inter-account transfer without altering festival income/expense
   */
  static async transferFunds(input: TransferFundsInput) {
    return await prisma.$transaction(async (tx) => {
      const fromAcc = await tx.account.findUniqueOrThrow({ where: { id: input.fromAccountId } });
      const toAcc = await tx.account.findUniqueOrThrow({ where: { id: input.toAccountId } });

      if (Number(fromAcc.currentBalance) < Number(input.amount)) {
        throw new Error('INSUFFICIENT_FUNDS: Source account has insufficient balance.');
      }

      const masterTx = await tx.transaction.create({
        data: {
          mandalId: input.mandalId,
          festivalId: input.festivalId,
          type: 'TRANSFER',
          amount: input.amount
        }
      });

      const updatedFromBalance = Number(fromAcc.currentBalance) - Number(input.amount);
      const updatedToBalance = Number(toAcc.currentBalance) + Number(input.amount);

      await tx.account.update({ where: { id: fromAcc.id }, data: { currentBalance: updatedFromBalance } });
      await tx.account.update({ where: { id: toAcc.id }, data: { currentBalance: updatedToBalance } });

      await tx.ledgerEntry.create({
        data: {
          transactionId: masterTx.id,
          accountId: fromAcc.id,
          debit: 0,
          credit: input.amount,
          balanceAfter: updatedFromBalance
        }
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: masterTx.id,
          accountId: toAcc.id,
          debit: input.amount,
          credit: 0,
          balanceAfter: updatedToBalance
        }
      });

      await tx.accountTransfer.create({
        data: {
          transactionId: masterTx.id,
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          amount: input.amount,
          notes: input.notes
        }
      });

      return { success: true, fromBalance: updatedFromBalance, toBalance: updatedToBalance };
    });
  }

  /**
   * Derive live festival totals and balances strictly from transactions
   */
  static async getFestivalFinancialSummary(mandalId: string, festivalId: string) {
    const [incomeAgg, expenseAgg, accounts, recentTransactions] = await Promise.all([
      prisma.income.aggregate({
        where: { festivalId, transaction: { isArchived: false } },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.expense.aggregate({
        where: { festivalId, status: 'APPROVED', transaction: { isArchived: false } },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.account.findMany({
        where: { mandalId, isActive: true }
      }),
      prisma.transaction.findMany({
        where: { mandalId, festivalId, isArchived: false },
        take: 10,
        orderBy: { date: 'desc' },
        include: {
          income: { select: { donorName: true, category: { select: { name: true } }, receipt: { select: { receiptNumber: true, shareToken: true } } } },
          expense: { select: { payeeName: true, category: { select: { name: true } }, status: true } }
        }
      })
    ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpense = Number(expenseAgg._sum.amount || 0);
    const netBalance = totalIncome - totalExpense;

    const cash = accounts.find(a => a.type === 'CASH')?.currentBalance || 0;
    const bank = accounts.find(a => a.type === 'BANK')?.currentBalance || 0;
    const upi = accounts.find(a => a.type === 'UPI')?.currentBalance || 0;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      cashBalance: Number(cash),
      bankBalance: Number(bank),
      upiBalance: Number(upi),
      donationCount: incomeAgg._count.id,
      recentTransactions
    };
  }
}
