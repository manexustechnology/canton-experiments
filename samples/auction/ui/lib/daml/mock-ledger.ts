/**
 * In-memory mock ledger. Reproduces the choice semantics of the DAML
 * `Auction` template so the whole UI runs with no Canton participant.
 *
 * Every rule enforced here mirrors an `assertMsg` / controller / `ensure`
 * clause in ../../daml/Auction.daml — the comments name the line being
 * emulated. Swapping in the live JSON API client should not change a
 * single observable behaviour.
 *
 * State lives at module scope so it survives across requests within a
 * single dev-server process (it resets on restart — it's a mock).
 */

import { LedgerError } from './ledger';
import type { Ledger } from './ledger';
import type {
  AuctionContract,
  AuctionPayload,
  BidInfo,
  CreateAuctionArgs,
  ExtendArgs,
  PlaceBidArgs,
} from './types';

interface StoredContract {
  contractId: string;
  payload: AuctionPayload;
  archived: boolean;
}

let seq = 0;
const store = new Map<string, StoredContract>();

function nextCid(): string {
  seq += 1;
  // Shaped loosely like a Canton contract id so it reads realistically.
  return `00mock${seq.toString().padStart(4, '0')}auction`;
}

function toContract(c: StoredContract): AuctionContract {
  return { contractId: c.contractId, payload: c.payload };
}

/** `signatory seller; observer bidders` — who can see this contract. */
function isVisibleTo(payload: AuctionPayload, party: string): boolean {
  return payload.seller === party || payload.bidders.includes(party);
}

function liveContract(contractId: string): StoredContract {
  const c = store.get(contractId);
  if (!c || c.archived) {
    throw new LedgerError(`Auction ${contractId} not found or already archived`, 404);
  }
  return c;
}

function num(s: string): number {
  return Number.parseFloat(s);
}

/** Format a JS number back to the `Numeric 2` decimal-string shape. */
function num2(n: number): string {
  return n.toFixed(2);
}

class MockLedger implements Ledger {
  async listAuctions(actingParty: string): Promise<AuctionContract[]> {
    return [...store.values()]
      .filter((c) => !c.archived && isVisibleTo(c.payload, actingParty))
      .map(toContract);
  }

  async createAuction(actingParty: string, args: CreateAuctionArgs): Promise<AuctionContract> {
    // `ensure reservePrice >= 0.0`
    if (num(args.reservePrice) < 0) {
      throw new LedgerError('reservePrice must be >= 0', 400);
    }
    const payload: AuctionPayload = {
      seller: actingParty,
      bidders: args.bidders,
      itemDescription: args.itemDescription,
      reservePrice: num2(num(args.reservePrice)),
      closesAt: args.closesAt,
      highBid: null,
    };
    const contractId = nextCid();
    store.set(contractId, { contractId, payload, archived: false });
    return { contractId, payload };
  }

  async placeBid(
    actingParty: string,
    contractId: string,
    args: PlaceBidArgs,
  ): Promise<AuctionContract> {
    const c = liveContract(contractId);
    const p = c.payload;

    // `controller bidder` + `assertMsg "Bidder not invited"`
    if (!p.bidders.includes(actingParty)) {
      throw new LedgerError('Bidder not invited', 403);
    }
    // `assertMsg "Auction has closed" (now < closesAt)`
    if (Date.now() >= Date.parse(p.closesAt)) {
      throw new LedgerError('Auction has closed', 409);
    }
    // `price > (highBid ? highBid.price : reservePrice)`
    const floor = p.highBid ? num(p.highBid.price) : num(p.reservePrice);
    if (num(args.price) <= floor) {
      throw new LedgerError('Bid must exceed current high / reserve', 409);
    }

    // Consuming choice: archive old, create successor with new highBid.
    c.archived = true;
    const newHigh: BidInfo = { bidder: actingParty, price: num2(num(args.price)) };
    const payload: AuctionPayload = { ...p, highBid: newHigh };
    const newCid = nextCid();
    store.set(newCid, { contractId: newCid, payload, archived: false });
    return { contractId: newCid, payload };
  }

  async settle(actingParty: string, contractId: string): Promise<BidInfo | null> {
    const c = liveContract(contractId);
    const p = c.payload;
    // `controller seller`
    if (p.seller !== actingParty) {
      throw new LedgerError('Only the seller can settle', 403);
    }
    // `assertMsg "Auction has not yet closed" (now >= closesAt)`
    if (Date.now() < Date.parse(p.closesAt)) {
      throw new LedgerError('Auction has not yet closed', 409);
    }
    // Consuming choice with no `create this` → contract archived.
    c.archived = true;
    return p.highBid;
  }

  async extend(actingParty: string, contractId: string, args: ExtendArgs): Promise<AuctionContract> {
    const c = liveContract(contractId);
    const p = c.payload;
    // `controller seller`
    if (p.seller !== actingParty) {
      throw new LedgerError('Only the seller can extend', 403);
    }
    // `assertMsg "Auction already closed" (now < closesAt)`
    if (Date.now() >= Date.parse(p.closesAt)) {
      throw new LedgerError('Auction already closed', 409);
    }
    c.archived = true;
    const closesAt = new Date(Date.parse(p.closesAt) + args.minutes * 60_000).toISOString();
    const payload: AuctionPayload = { ...p, closesAt };
    const newCid = nextCid();
    store.set(newCid, { contractId: newCid, payload, archived: false });
    return { contractId: newCid, payload };
  }
}

// ---- Seed a few auctions so the gallery isn't empty on boot ----

function seed() {
  if (store.size > 0) return;
  const now = Date.now();
  const inMinutes = (m: number) => new Date(now + m * 60_000).toISOString();

  // Open auction, mirrors the sample's "Vintage Daml Compiler T-shirt".
  const a1 = nextCid();
  store.set(a1, {
    contractId: a1,
    archived: false,
    payload: {
      seller: 'Seller',
      bidders: ['Alice', 'Bob', 'Charlie'],
      itemDescription: 'Vintage Daml Compiler T-shirt',
      reservePrice: '50.00',
      closesAt: inMinutes(60),
      highBid: { bidder: 'Bob', price: '75.00' },
    },
  });

  // A second open lot with no bids yet.
  const a2 = nextCid();
  store.set(a2, {
    contractId: a2,
    archived: false,
    payload: {
      seller: 'Seller',
      bidders: ['Alice', 'Bob', 'Charlie'],
      itemDescription: 'Canton Validator Node — 1 year sponsorship',
      reservePrice: '1200.00',
      closesAt: inMinutes(180),
      highBid: null,
    },
  });

  // A lot that has already closed and is awaiting settlement.
  const a3 = nextCid();
  store.set(a3, {
    contractId: a3,
    archived: false,
    payload: {
      seller: 'Seller',
      bidders: ['Alice', 'Bob', 'Charlie'],
      itemDescription: 'Genesis Block Print #001',
      reservePrice: '300.00',
      closesAt: inMinutes(-5),
      highBid: { bidder: 'Alice', price: '420.00' },
    },
  });
}

seed();

export const mockLedger: Ledger = new MockLedger();
