/**
 * Canton / DAML wiring. Server-side only — tokens must never reach the
 * browser.
 *
 * The field names and defaults here mirror Tenzro's `CantonConfig`
 * (tenzro-network/crates/tenzro-bridge/src/canton.rs): a co-located
 * participant reached over its JSON Ledger API v2, default port 7575,
 * optional JWT, a DAML `act_as` party of the form "name::fingerprint",
 * and an application/user id for command dedup.
 *
 * If `CANTON_PARTICIPANT_HOST` is set we talk to a real participant.
 * Otherwise the app runs against an in-memory mock ledger that
 * reproduces the `Auction` contract's choice semantics, so the whole UI
 * works with no Canton node.
 *
 * Live wiring (after uploading the auction DAR to a participant — e.g.
 * via `tenzro contract deploy --vm daml` or `daml ledger upload-dar`):
 *
 *   CANTON_PARTICIPANT_HOST=localhost
 *   CANTON_JSON_API_PORT=7575
 *   CANTON_JWT=<JWT authorizing actAs for the auction parties>
 */

export const CANTON_PARTICIPANT_HOST = process.env.CANTON_PARTICIPANT_HOST ?? '';
export const CANTON_JSON_API_PORT = Number(process.env.CANTON_JSON_API_PORT ?? '7575');
export const CANTON_TLS = process.env.CANTON_TLS === 'true';

/** Application/user id submitted with commands (Canton dedup key). */
export const CANTON_APP_ID = process.env.CANTON_APP_ID ?? 'tenzro-auction-app';

/** DAR package name → template id `#<pkg>:Auction:Auction`. */
export const CANTON_PACKAGE = process.env.CANTON_PACKAGE ?? 'auction';

export const USING_LIVE_LEDGER = CANTON_PARTICIPANT_HOST.length > 0;

/** Base JSON Ledger API v2 URL, built the same way CantonAdapter does. */
export function jsonApiBaseUrl(): string {
  const scheme = CANTON_TLS ? 'https' : 'http';
  return `${scheme}://${CANTON_PARTICIPANT_HOST}:${CANTON_JSON_API_PORT}/v2`;
}

/** Resolve the bearer token for a given party name. */
export function tokenForParty(partyName: string): string | undefined {
  const specific = process.env[`CANTON_JWT_${partyName.toUpperCase()}`];
  return specific ?? process.env.CANTON_JWT;
}

/**
 * Map a friendly party name to its on-ledger `act_as` party id. On a
 * sandbox started from Main:setup the ids are allocated from these
 * hints, so by default name === id. Override per party with
 * CANTON_PARTY_SELLER=Seller::1220abc… etc. for a namespaced participant.
 */
export function partyId(partyName: string): string {
  return process.env[`CANTON_PARTY_${partyName.toUpperCase()}`] ?? partyName;
}
