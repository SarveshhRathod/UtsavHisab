import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestContext } from '@/server/auth/session';
import { AccountingService } from '@/server/services/accounting.service';

export async function POST(req: NextRequest) {
  const { context, errorResponse } = await resolveRequestContext(req, 'income.create');
  if (errorResponse) return errorResponse;

  try {
    const { mutations } = await req.json();
    const results = [];

    for (const item of mutations) {
      if (item.type === 'INCOME') {
        const res = await AccountingService.recordIncome({
          ...item.payload,
          mandalId: context!.mandalId,
          collectorId: context!.userId,
          idempotencyKey: item.id
        });
        results.push({ id: item.id, status: 'SYNCED', data: res });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
  }
}
