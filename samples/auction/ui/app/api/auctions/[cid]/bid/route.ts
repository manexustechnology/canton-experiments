/** /api/auctions/[cid]/bid — exercise PlaceBid as the acting party. */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getLedger } from '@/lib/daml/ledger';
import { actingPartyFrom, withLedger } from '@/lib/daml/server';

export const dynamic = 'force-dynamic';

const bidSchema = z.object({
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Bid must be a number with up to 2 decimals'),
});

export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  const party = actingPartyFrom(req);
  const parsed = bidSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid bid' },
      { status: 400 },
    );
  }
  return withLedger(() => getLedger().placeBid(party, cid, { price: parsed.data.price }));
}
