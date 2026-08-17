import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mandalId = searchParams.get('mandalId');
  const festivalId = searchParams.get('festivalId');

  if (!mandalId || !festivalId) {
    return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
  }

  const [incomes, expenses, accounts] = await Promise.all([
    prisma.income.findMany({
      where: { festivalId, transaction: { isArchived: false } },
      include: { category: true, receipt: true }
    }),
    prisma.expense.findMany({
      where: { festivalId, status: 'APPROVED', transaction: { isArchived: false } },
      include: { category: true }
    }),
    prisma.account.findMany({ where: { mandalId, isActive: true } })
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Income
  const incomeRows = incomes.map(i => ({
    'Receipt No': i.receipt?.receiptNumber || '-',
    'Date': i.createdAt.toISOString().split('T')[0],
    'Donor Name': i.donorName,
    'Phone': i.donorPhone || '-',
    'Category': i.category.name,
    'Payment Mode': i.paymentMethod,
    'Amount (INR)': Number(i.amount)
  }));
  const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
  XLSX.utils.book_append_sheet(wb, wsIncome, 'Income (जमा)');

  // Sheet 2: Expenses
  const expenseRows = expenses.map(e => ({
    'Date': e.createdAt.toISOString().split('T')[0],
    'Payee / Vendor': e.payeeName,
    'Bill No': e.billNumber || '-',
    'Category': e.category.name,
    'Payment Mode': e.paymentMethod,
    'Amount (INR)': Number(e.amount)
  }));
  const wsExpense = XLSX.utils.json_to_sheet(expenseRows);
  XLSX.utils.book_append_sheet(wb, wsExpense, 'Expenses (खर्च)');

  // Generate buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="UtsavHisab_Report_${festivalId}.xlsx"`
    }
  });
}
