import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestContext } from '@/server/auth/session';
import { AccountingService } from '@/server/services/accounting.service';
import { z } from 'zod';

const incomeSchema = z.object({
  festivalId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  donorName: z.string().min(2),
  donorPhone: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'OTHER']),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional()
});

export async function POST(req: NextRequest) {
  const { context, errorResponse } = await resolveRequestContext(req, 'income.create');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const valid = incomeSchema.parse(body);

    const result = await AccountingService.recordIncome({
      mandalId: context!.mandalId,
      festivalId: valid.festivalId,
      categoryId: valid.categoryId,
      amount: valid.amount,
      donorName: valid.donorName,
      donorPhone: valid.donorPhone,
      paymentMethod: valid.paymentMethod,
      collectorId: context!.userId,
      notes: valid.notes,
      idempotencyKey: valid.idempotencyKey
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: err.message } },
      { status: 400 }
    );
  }
}
