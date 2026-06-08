/**
 * TypeScript mirrors of the DAML `Auction` module
 * (../../daml/Auction.daml).
 *
 * Shapes match the JSON encoding the Canton HTTP JSON API v2 produces
 * for the `Auction` template and its `BidInfo` record, so the same
 * types serve both the live client and the in-memory mock.
 *
 *   template Auction with
 *     seller : Party
 *     bidders : [Party]
 *     itemDescription : Text
 *     reservePrice : Numeric 2
 *     closesAt : Time
 *     highBid : Optional BidInfo
 */

/** A DAML `Party`. On Canton this is a fully-qualified party id. */
export type Party = string;

/** DAML `Numeric 2`, carried as a decimal string to avoid float drift. */
export type Numeric = string;

/** DAML `Time`, ISO-8601 UTC as emitted by the JSON API. */
export type DamlTime = string;

/** DAML `BidInfo` record. */
export interface BidInfo {
  bidder: Party;
  price: Numeric;
}

/** The `Auction` template payload (contract arguments). */
export interface AuctionPayload {
  seller: Party;
  bidders: Party[];
  itemDescription: string;
  reservePrice: Numeric;
  closesAt: DamlTime;
  highBid: BidInfo | null;
}

/** An active `Auction` contract: its id plus current payload. */
export interface AuctionContract {
  contractId: string;
  payload: AuctionPayload;
}

/** Arguments to create a fresh auction (seller is the acting party). */
export interface CreateAuctionArgs {
  bidders: Party[];
  itemDescription: string;
  reservePrice: Numeric;
  closesAt: DamlTime;
}

/** A `PlaceBid` exercise. */
export interface PlaceBidArgs {
  price: Numeric;
}

/** An `Extend` exercise — relative time expressed in whole minutes. */
export interface ExtendArgs {
  minutes: number;
}
