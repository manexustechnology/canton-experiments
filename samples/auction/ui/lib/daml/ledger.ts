/**
 * The Ledger seam. Route handlers depend only on this interface; the
 * concrete implementation is chosen at runtime from the environment
 * (live Canton JSON API vs. in-memory mock). This is the single place
 * the rest of the app reaches the ledger.
 */

import { CantonLedger } from './canton-adapter';
import { USING_LIVE_LEDGER, ledgerBackend } from './config';
import { mockLedger } from './mock-ledger';
import { TenzroSdkLedger } from './tenzro-sdk-ledger';
import type {
  AuctionContract,
  BidInfo,
  CreateAuctionArgs,
  ExtendArgs,
  PlaceBidArgs,
} from './types';

export interface Ledger {
  /** Active auctions visible to `actingParty` (as seller or invited bidder). */
  listAuctions(actingParty: string): Promise<AuctionContract[]>;
  /** Create an auction with `actingParty` as the seller/signatory. */
  createAuction(actingParty: string, args: CreateAuctionArgs): Promise<AuctionContract>;
  /** Exercise `PlaceBid`; returns the resulting (new) auction contract. */
  placeBid(actingParty: string, contractId: string, args: PlaceBidArgs): Promise<AuctionContract>;
  /** Exercise `Settle`; returns the winning bid, or null if none cleared. */
  settle(actingParty: string, contractId: string): Promise<BidInfo | null>;
  /** Exercise `Extend`; returns the resulting (new) auction contract. */
  extend(actingParty: string, contractId: string, args: ExtendArgs): Promise<AuctionContract>;
}

/** Error carrying an HTTP status so route handlers can relay it cleanly. */
export class LedgerError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'LedgerError';
    this.status = status;
  }
}

let live: CantonLedger | null = null;
let tenzro: TenzroSdkLedger | null = null;

export function getLedger(): Ledger {
  switch (ledgerBackend()) {
    case 'tenzro':
      // Hosted node via the Tenzro TS SDK — drives the uploaded DAR.
      return (tenzro ??= new TenzroSdkLedger());
    case 'canton':
      // Co-located participant via the raw Canton JSON Ledger API v2.
      return (live ??= new CantonLedger());
    default:
      return mockLedger;
  }
}

export { USING_LIVE_LEDGER };
