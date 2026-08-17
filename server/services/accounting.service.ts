import { PrismaClient, PaymentMethod, Role } from '@prisma/client';
import { numberToWords } from '@/lib/i18n';

const prisma = new PrismaClient();

export interface CreateIncomeInput {
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

export interface CreateExpenseInput {
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

export interface TransferInput {
  mandalId: string;
  festivalId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  notes?: string;
  userId: string;
}

export class AccountingService {
  /**
   * Records Income, creates Journal/Ledger entries, updates Account balance,
   * updates Donor database, and issues an atomic sequential Receipt.
   */
  static async recordIncome(input: CreateIncomeInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Idempotency Check for Offline Sync
      if (input.idempotencyKey) {
        const existingTx = await tx.transaction.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { income: { include: { receipt: true } } }
        });
        if (existingTx && existingTx.income) {
          return existingTx.income;
        }
      }

      // 2. Fetch or create donor
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

      // 3. Resolve Target Financial Account (Cash, Bank, or UPI)
      let account = await tx.account.findFirst({
        where: { mandalId: input.mandalId, type: input.paymentMethod, isActive: true }
      });

      if (!account) {
        account = await tx.account.create({
          data: {
            mandalId: input.mandalId,
            name: `${input.paymentMethod} Account`,
            type: input.paymentMethod,
            openingBalance: 0,
            currentBalance: 0
          }
        });
      }

      // 4. Create Financial Master Transaction
      const transaction = await tx.transaction.create({
        data: {
          mandalId: input.mandalId,
          festivalId: input.festivalId,
          type: 'INCOME',
          amount: input.amount,
          idempotencyKey: input.idempotencyKey
        }
      });

      // 5. Update Account Balance atomically & record Ledger Entry
      const updatedBalance = Number(account.currentBalance) + Number(input.amount);
      await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: updatedBalance }
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: account.id,
          debit: input.amount, // Asset increased
          credit: 0,
          balanceAfter: updatedBalance
        }
      });

      // 6. Create Income record
      const income = await tx.income.create({
        data: {
          transactionId: transaction.id,
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

      // 7. Generate Sequential Receipt
      const template = await tx.receiptTemplate.findUnique({
        where: { mandalId: input.mandalId }
      });
      const prefix = template?.prefix || 'MS';

      const lastReceipt = await tx.receipt.findFirst({
        where: { festivalId: input.festivalId },
        orderBy: { sequenceNumber: 'desc' }
      });
      const nextSequence = (lastReceipt?.sequenceNumber || 0) + 1;
      const paddedSeq = String(nextSequence).padStart(6, '0');
      const year = new Date().getFullYear();
      const receiptNumber = `${prefix}-${year}-${paddedSeq}`;

      const receipt = await tx.receipt.create({
        data: {
          incomeId: income.id,
          festivalId: input.festivalId,
          receiptNumber,
          sequenceNumber: nextSequence,
          donorName: input.donorName,
          amount: input.amount,
          amountInWords: numberToWords(Number(input.amount), 'mr')
        }
      });

      // 8. Create Audit Log
      await tx.auditLog.create({
        data: {
          mandalId: input.mandalId,
          userId: input.collectorId,
          action: 'INCOME_RECORDED',
          entity: 'Transaction',
          entityId: transaction.id,
          after: { amount: input.amount, donor: input.donorName, receiptNumber }
        }
      });

      return { ...income, receipt };
    });
  }

  /**
   * Records Expense, evaluates approval thresholds, applies ledger reduction when approved.
   */
  static async recordExpense(input: CreateExpenseInput) {
    return await prisma.$transaction(async (tx) => {
      // Threshold rules: < 5000 auto-approved, >= 5000 requires Treasurer / Admin approval
      const requiresApproval = Number(input.amount) >= 5000;
      const initialStatus = requiresApproval ? 'PENDING' : 'APPROVED';

      const transaction = await tx.transaction.create({
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
          transactionId: transaction.id,
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

      // If auto-approved, balance is deducted immediately
      if (initialStatus === 'APPROVED') {
        const account = await tx.account.findFirst({
          where: { mandalId: input.mandalId, type: input.paymentMethod, isActive: true }
        });

        if (account) {
          const updatedBalance = Number(account.currentBalance) - Number(input.amount);
          await tx.account.update({
            where: { id: account.id },
            data: { currentBalance: updatedBalance }
          });

          await tx.ledgerEntry.create({
            data: {
              transactionId: transaction.id,
              accountId: account.id,
              debit: 0,
              credit: input.amount, // Asset decreased
              balanceAfter: updatedBalance
            }
          });
        }
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
   * Atomic inter-account transfer (e.g., Cash collected deposited into Bank)
   */
  static async transferFunds(input: TransferInput) {
    return await prisma.$transaction(async (tx) => {
      const fromAcc = await tx.account.findUniqueOrThrow({ where: { id: input.fromAccountId } });
      const toAcc = await tx.account.findUniqueOrThrow({ where: { id: input.toAccountId } });

      if (Number(fromAcc.currentBalance) < Number(input.amount)) {
        throw new Error('Insufficient balance in source account for transfer');
      }

      const transaction = await tx.transaction.create({
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

      // Outgoing credit entry
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: fromAcc.id,
          debit: 0,
          credit: input.amount,
          balanceAfter: updatedFromBalance
        }
      });

      // Incoming debit entry
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: toAcc.id,
          debit: input.amount,
          credit: 0,
          balanceAfter: updatedToBalance
        }
      });

      await tx.accountTransfer.create({
        data: {
          transactionId: transaction.id,
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
   * Retrieves accurate dashboard metrics strictly derived from active festival transactions
   */
  static async getFestivalFinancialSummary(mandalId: string, festivalId: string) {
    const [incomeAgg, expenseAgg, accounts, recentTransactions] = await Promise.all([
      prisma.income.aggregate({
        where: {
          festivalId,
          transaction: { isArchived: false }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.expense.aggregate({
        where: {
          festivalId,
          status: 'APPROVED',
          transaction: { isArchived: false }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.account.findMany({
        where: { mandalId, isActive: true },
        select: { id: true, name: true, type: true, currentBalance: true }
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

    const cashAccount = accounts.find(a => a.type === 'CASH');
    const bankAccount = accounts.find(a => a.type === 'BANK');
    const upiAccount = accounts.find(a => a.type === 'UPI');

    return {
      totalIncome,
      totalExpense,
      netBalance,
      cashBalance: Number(cashAccount?.currentBalance || 0),
      bankBalance: Number(bankAccount?.currentBalance || 0),
      upiBalance: Number(upiAccount?.currentBalance || 0),
      donationCount: incomeAgg._count.id,
      recentTransactions
    };
  }
}
