# Auction House — Next.js UI for the Canton/DAML `Auction` sample

Web app for the [`Auction`](../daml/Auction.daml) contract: list lots, place
ascending-price bids, extend, and settle. Runs on a built-in mock by default;
switch to a real Canton ledger with env vars.

## What's in it

```
ui/
├─ app/
│  ├─ (app)/             # gallery, /create, /auctions/[cid]
│  └─ api/auctions/…     # route handlers → the Ledger seam
└─ lib/daml/
   ├─ types.ts           # TS mirror of the Auction template + BidInfo
   ├─ ledger.ts          # Ledger interface + getLedger() backend picker
   ├─ mock-ledger.ts     # in-memory ledger (default)
   ├─ tenzro-sdk-ledger.ts  # live: hosted Tenzro node via tenzro-sdk (RPC)
   ├─ canton-adapter.ts  # live: co-located participant via raw JSON Ledger API v2
   └─ config.ts          # env wiring + backend selection
```

Backend is chosen by `LEDGER_BACKEND` (`mock` | `tenzro` | `canton`), or
auto-detected: an API key ⇒ `tenzro`, a participant host ⇒ `canton`, else `mock`.

## Run (mock — no node needed)

```bash
cd canton-experiments/samples/auction/ui
bun install
bun run dev          # http://localhost:3001
```

Use the party switcher (top-right) to act as `Seller`, `Alice`, `Bob`, or
`Charlie`. Only invited bidders can bid; only the seller can settle/extend.

## Run against the hosted Tenzro node

```bash
cp .env.tenzro.local .env.local      # then set:
#   LEDGER_BACKEND=tenzro
#   TENZRO_RPC_ENDPOINT=https://rpc.tenzro.network
#   TENZRO_API_KEY=<operator-issued canton-scope key>
#   CANTON_PACKAGE=auction
#   CANTON_PARTY_ALICE/BOB/CHARLIE=<name>::<namespace>   # bidders need FQ party ids
bun run dev
```

Seller defaults to the key's party (`getMyUser().primaryParty`); override with
`CANTON_PARTY_SELLER`. Bidder parties must be allocated and granted `CanActAs`.

> Current node: writes work; the live read is degraded, so `listAuctions` is
> served from a per-process cache of what this app created/modified (resets on
> restart). It switches to the live read automatically once the node read fix
> ships. Details: `CANTON_OPERATOR_BUGS.txt` (repo root).

## Run against a co-located participant

Set `CANTON_PARTICIPANT_HOST` / `CANTON_JSON_API_PORT` / `CANTON_JWT` in
`.env.local` (see `.env.example`); the app talks to its JSON Ledger API v2.

## Notes

- `bun run typecheck` / `bun run build` pass clean.
- `lib/ui/` is vendored from `@tenzro/ui`; re-copy to pick up design changes.
