import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { parseJsonBody } from '@/lib/validation';
import { BankIngestRequestSchema } from '@/lib/schemas/bank-ingest';
import { ingestBankTransactions } from '@/lib/bank/ingest';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';
import { asError } from '@/lib/errors';
import { BANK_TX_DEFAULT_ORDER } from '@/lib/bank/fields';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId, _req) => {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = hasText(limitParam) ? Math.max(1, Math.min(Number.parseInt(limitParam, 10), 100)) : 10;

    const rows = await prisma.bankTransaction.findMany({
      where: { userId },
      orderBy: BANK_TX_DEFAULT_ORDER,
      take: limit,
    });

    return NextResponse.json({ transactions: rows });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (_userId, _req) => {
    const parsed = await parseJsonBody(request, BankIngestRequestSchema);
    if (!parsed.ok) return parsed.response;

    try {
      const stats = await ingestBankTransactions(parsed.data.transactions);
      return NextResponse.json({ ok: true, ...stats });
    } catch (error) {
      asError(error);
      logError('bank_ingest_failed', error);
      return NextResponse.json({ ok: false, error: 'bank_ingest_failed' }, { status: 500 });
    }
  });
}
