/**
 * Browser-side ledger API. Thin fetch wrappers over the /api routes,
 * each tagging the request with the acting party so the server submits
 * commands on its behalf. All ledger access from the client goes
 * through here.
 */

import { ACTING_PARTY_HEADER } from '@/lib/daml/server';
import type { AuctionContract, BidInfo } from '@/lib/daml/types';
import type { PartyName } from '@/lib/parties';

async function request<T>(party: PartyName, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      [ACTING_PARTY_HEADER]: party,
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data.error as string) ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export interface ListAuctionsResult {
  auctions: AuctionContract[];
  live: boolean;
}

export function listAuctions(party: PartyName): Promise<ListAuctionsResult> {
  return request<ListAuctionsResult>(party, '/api/auctions');
}

export interface CreateAuctionInput {
  itemDescription: string;
  reservePrice: string;
  closesAt: string;
  bidders: PartyName[];
}

export function createAuction(party: PartyName, input: CreateAuctionInput): Promise<AuctionContract> {
  return request<AuctionContract>(party, '/api/auctions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function placeBid(
  party: PartyName,
  contractId: string,
  price: string,
): Promise<AuctionContract> {
  return request<AuctionContract>(party, `/api/auctions/${contractId}/bid`, {
    method: 'POST',
    body: JSON.stringify({ price }),
  });
}

export function settleAuction(
  party: PartyName,
  contractId: string,
): Promise<{ winner: BidInfo | null }> {
  return request<{ winner: BidInfo | null }>(party, `/api/auctions/${contractId}/settle`, {
    method: 'POST',
  });
}

export function extendAuction(
  party: PartyName,
  contractId: string,
  minutes: number,
): Promise<AuctionContract> {
  return request<AuctionContract>(party, `/api/auctions/${contractId}/extend`, {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  });
}
