/**
 * Server-only helpers shared by the route handlers: resolve the acting
 * party from the request, and turn a LedgerError into a clean JSON
 * response. Keeping this here means the handlers stay one-liners.
 */

import { NextResponse } from 'next/server';

import { type PartyName, isPartyName } from '@/lib/parties';
import { LedgerError } from './ledger';

export const ACTING_PARTY_HEADER = 'x-acting-party';

/** Read + validate the acting party. Defaults to Seller if absent. */
export function actingPartyFrom(req: Request): PartyName {
  const raw = req.headers.get(ACTING_PARTY_HEADER);
  if (raw && isPartyName(raw)) return raw;
  return 'Seller';
}

/** Run a ledger op and map LedgerError → matching HTTP status. */
export async function withLedger<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch (err) {
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Unexpected ledger error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
