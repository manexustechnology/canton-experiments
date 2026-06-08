/** /api/auctions/[cid]/settle — seller exercises Settle after close. */

import { getLedger } from '@/lib/daml/ledger';
import { actingPartyFrom, withLedger } from '@/lib/daml/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  const party = actingPartyFrom(req);
  return withLedger(async () => {
    const winner = await getLedger().settle(party, cid);
    return { winner };
  });
}
