import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mandalId = searchParams.get('mandalId');
  const festivalId = searchParams.get('festivalId');

  if (!mandalId || !festivalId) {
    return NextResponse.json({ success: false, message: 'Missing tenant or festival query parameters' }, { status: 400 });
  }

  const [mandal, festival, incomes, expenses] = await Promise.all([
    prisma.mandal.findUnique({ where: { id: mandalId } }),
    prisma.festival.findUnique({ where: { id: festivalId } }),
    prisma.income.findMany({
      where: { festivalId, transaction: { isArchived: false } },
      include: { category: true }
    }),
    prisma.expense.findMany({
      where: { festivalId, status: 'APPROVED', transaction: { isArchived: false } },
      include: { category: true }
    })
  ]);

  if (!mandal || !festival) {
    return NextResponse.json({ success: false, message: 'Mandal or Festival not found' }, { status: 404 });
  }

  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIncome - totalExpense;

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  // PDF Layout Construction
  doc.fontSize(18).text(mandal.name, { align: 'center' });
  doc.fontSize(10).text(`${mandal.address}, ${mandal.city} - ${mandal.pincode}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Financial Statement: ${festival.name}`, { align: 'center', underline: true });
  doc.moveDown();

  // Summary Table
  doc.fontSize(11).text(`Total Income: INR ${totalIncome.toLocaleString('en-IN')}`);
  doc.text(`Total Approved Expenses: INR ${totalExpense.toLocaleString('en-IN')}`);
  doc.fontSize(12).text(`Closing Balance: INR ${balance.toLocaleString('en-IN')}`, { bold: true });
  doc.moveDown(2);

  doc.fontSize(12).text('Recent Income Records:', { underline: true });
  incomes.slice(0, 15).forEach((inc, idx) => {
    doc.fontSize(9).text(`${idx + 1}. ${inc.donorName} - INR ${Number(inc.amount).toLocaleString('en-IN')} (${inc.paymentMethod})`);
  });

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${mandal.shortName}-${festival.financialYear}-Report.pdf"`
    }
  });
}
