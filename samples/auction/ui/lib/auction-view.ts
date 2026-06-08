/**
 * Pure view-model helpers over an AuctionContract — shared by the
 * gallery card and the detail page so "is it open?", "what's the floor?"
 * and "what can this party do?" are computed in exactly one place.
 */

import type { AuctionContract } from '@/lib/daml/types';
import type { PartyName } from '@/lib/parties';

export type AuctionStatus = 'open' | 'closed';

export function statusOf(a: AuctionContract, now: number = Date.now()): AuctionStatus {
  return now < Date.parse(a.payload.closesAt) ? 'open' : 'closed';
}

export function msUntilClose(a: AuctionContract, now: number = Date.now()): number {
  return Date.parse(a.payload.closesAt) - now;
}

/** The minimum a new bid must strictly exceed. */
export function bidFloor(a: AuctionContract): number {
  const { highBid, reservePrice } = a.payload;
  return Number.parseFloat(highBid ? highBid.price : reservePrice);
}

export interface AuctionRole {
  isSeller: boolean;
  isBidder: boolean;
  isHighBidder: boolean;
}

export function roleOf(a: AuctionContract, party: PartyName): AuctionRole {
  return {
    isSeller: a.payload.seller === party,
    isBidder: a.payload.bidders.includes(party),
    isHighBidder: a.payload.highBid?.bidder === party,
  };
}
