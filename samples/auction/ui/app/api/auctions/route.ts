/**
 * /api/auctions — list visible auctions (GET) and create one (POST).
 *
 * The acting party arrives in the x-acting-party header; the server
 * forwards it to the ledger so list visibility and create authority are
 * decided by the ledger (or the mock), never trusted from the client
 * beyond identity selection.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { USING_LIVE_LEDGER, getLedger } from '@/lib/daml/ledger';
import { actingPartyFrom, withLedger } from '@/lib/daml/server';
import { PARTIES } from '@/lib/parties';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const party = actingPartyFrom(req);
  return withLedger(async () => {
    const auctions = await getLedger().listAuctions(party);
    return { auctions, live: USING_LIVE_LEDGER };
  });
}

const createSchema = z.object({
  itemDescription: z.string().trim().min(1, 'Describe the item').max(200),
  reservePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Reserve must be a number with up to 2 decimals'),
  closesAt: z.string().datetime({ message: 'closesAt must be ISO-8601' }),
  bidders: z.array(z.enum(PARTIES)).min(1, 'Invite at least one bidder'),
});

export async function POST(req: Request) {
  const party = actingPartyFrom(req);
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }
  const { itemDescription, reservePrice, closesAt, bidders } = parsed.data;
  return withLedger(() =>
    getLedger().createAuction(party, {
      itemDescription,
      reservePrice,
      closesAt,
      // The seller shouldn't be in their own bidder list.
      bidders: bidders.filter((b) => b !== party),
    }),
  );
}
