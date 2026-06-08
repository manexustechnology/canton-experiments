/** /api/auctions/[cid]/extend — seller pushes the close time out. */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getLedger } from '@/lib/daml/ledger';
import { actingPartyFrom, withLedger } from '@/lib/daml/server';

export const dynamic = 'force-dynamic';

const extendSchema = z.object({
  minutes: z.number().int().positive().max(7 * 24 * 60),
});

export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  const party = actingPartyFrom(req);
  const parsed = extendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid extension' },
      { status: 400 },
    );
  }
  return withLedger(() => getLedger().extend(party, cid, { minutes: parsed.data.minutes }));
}
