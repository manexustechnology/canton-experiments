# Auction House — Next.js front-end for the Canton/DAML `Auction` sample

A web app for the [`Auction`](../daml/Auction.daml) DAML contract: list lots,
place ascending-price bids, extend, and settle — on the Canton ledger, with the
[Tenzro](https://tenzro.com) design system on top.

It runs **out of the box against a built-in mock ledger** (no Canton node
needed), and switches to a **real Canton ledger** via env vars — either the
**hosted Tenzro node** over JSON-RPC (`tenzro-sdk-ledger.ts`, the path this
sample is wired to today — see below) or a **co-located participant**'s raw JSON
Ledger API v2 (`canton-adapter.ts`, a TypeScript port of Tenzro's own
`CantonAdapter`). Both speak the same Canton wire format Tenzro validators use.

```
ui/
├─ app/
│  ├─ (app)/                 # gallery, /create, /auctions/[cid]  (shared shell)
│  └─ api/auctions/…         # server route handlers → the Ledger seam
├─ lib/
│  ├─ daml/
│  │  ├─ types.ts            # TS mirror of the Auction template + BidInfo
│  │  ├─ ledger.ts           # Ledger interface + getLedger() (live vs mock)
│  │  ├─ mock-ledger.ts      # in-memory ledger; mirrors every assertMsg/controller
│  │  ├─ canton-adapter.ts   # live client (raw JSON Ledger API v2, co-located node)
│  │  ├─ tenzro-sdk-ledger.ts# live client via `tenzro-sdk` → hosted node RPC
│  │  └─ config.ts           # CantonConfig-shaped env wiring + backend selection
│  ├─ client/                # browser fetch helpers + React Query hooks
│  └─ ui/                    # design system vendored from @tenzro/ui
└─ components/               # layout chrome + auction widgets
```

## Run it (mock ledger)

```bash
cd canton-experiments/samples/auction/ui
bun install
bun run dev          # http://localhost:3001
```

The mock seeds three lots (one with bids, one empty, one already closed and
awaiting settlement). Use the **party switcher** (top-right) to act as `Seller`,
`Alice`, `Bob`, or `Charlie` — the four parties `Main:setup` allocates. What you
can see and do follows the contract: only invited bidders can bid; only the
seller can settle/extend. Open two browser tabs as two parties to watch a bid
from one appear in the other (the list polls every 5s).

## How it maps to the DAML

| DAML (`Auction.daml`)            | App surface                                   |
|----------------------------------|-----------------------------------------------|
| `template Auction` (ACS)         | The lots gallery (`/`) — active contracts      |
| `signatory seller / observer bidders` | List visibility per acting party          |
| `choice PlaceBid`                | Bid panel (bidder role)                        |
| `choice Settle`                  | Seller panel, after close → winning `BidInfo`  |
| `choice Extend`                  | Seller panel, before close (+15/+30/+60m)      |
| `assertMsg` / `ensure` clauses   | Enforced server-side; surfaced as toasts       |

The mock ledger (`mock-ledger.ts`) reproduces each rule with a comment naming
the contract line it emulates, so swapping to the live ledger changes nothing
observable.

## Point it at a live Canton ledger (the Tenzro way)

1. **Deploy the DAR.** Build the sample and upload it to a participant — either
   with Tenzro's CLI (`tenzro contract deploy --vm daml …`) or directly:

   ```bash
   cd canton-experiments/samples/auction
   daml build                              # → .daml/dist/auction-0.1.0.dar
   daml start                              # sandbox + JSON API on :7575
   ```

2. **Wire the app.** Copy `.env.example` to `.env.local` and set at minimum:

   ```bash
   CANTON_PARTICIPANT_HOST=localhost
   CANTON_JSON_API_PORT=7575
   CANTON_JWT=<JWT authorizing actAs for the auction parties>
   ```

   These names mirror Tenzro's `CantonConfig`
   (`tenzro-network/crates/tenzro-bridge/src/canton.rs`). The badge in the top
   bar flips from **Mock ledger** to **Live Canton JSON API** once a host is set.

The live client (`canton-adapter.ts`) talks to the participant's **JSON Ledger
API v2** exactly as Tenzro's `CantonAdapter` does:

- `POST /v2/commands/submit-and-wait-for-transaction` — create / exercise, in the
  `{ commands:[{ commandType, templateId, … }], commandId, userId, actAs, readAs }`
  envelope (the `-transaction-tree` endpoint was removed in Canton 3.5);
- `POST /v2/state/active-contracts` — the lots gallery, via a
  `filtersByParty → cumulative → TemplateFilter` query.

Response parsing accepts both the Canton 3.5+ flat `transaction.events` shape and
the 3.3/3.4 `transactionTree.eventsById` tree, matching the adapter's fallbacks.

## Point it at the HOSTED Tenzro node (`rpc.tenzro.network`)

This is the path the sample is wired to today: instead of a co-located
participant, the app drives the **hosted** Tenzro node over JSON-RPC via the
`tenzro-sdk` package (`tenzro-sdk-ledger.ts`). The node proxies to the Canton
participant the auction DAR was uploaded to. Select it with `LEDGER_BACKEND` —
or just set `TENZRO_API_KEY` and it auto-selects.

```bash
cd canton-experiments/samples/auction/ui
cp .env.tenzro.local .env.local      # then edit:
#   LEDGER_BACKEND=tenzro
#   TENZRO_RPC_ENDPOINT=https://rpc.tenzro.network
#   TENZRO_API_KEY=<operator-issued canton-scope key>
#   CANTON_PACKAGE=auction
#   CANTON_PARTY_ALICE/BOB/CHARLIE=<name>::<namespace>   # bidders are observers; must be FQ party ids
bun run dev                          # http://localhost:3001
```

The seller defaults to the node's API-key party (`getMyUser().primaryParty`);
override with `CANTON_PARTY_SELLER`. Bidder party flows need those parties
allocated and granted `CanActAs` on the calling Canton user.

### Live status & adapter behavior (verified 2026-06-15, Canton 3.5.1)

The `tenzro-sdk-ledger.ts` adapter works around two realities of the currently
deployed node (full detail + fixes in `CANTON_OPERATOR_BUGS.txt` at the repo
root):

- **Writes work.** Create / PlaceBid / Settle / Extend all land on the live
  ledger. The adapter sends an explicit `act_as` on every submit — the deployed
  node rejects a submit with an empty actAs, and the SDK's typed params omit it
  (we forward it anyway, since `submitCommand` passes the params object through).
- **Reads are degraded.** The deployed node still builds the pre-3.5
  active-contracts request shape, so `listContracts` returns `-32000`. As a
  bridge, the adapter keeps a **write-derived cache** of the contract state every
  submit response returns and serves `listAuctions` from it when the live read
  fails. **Caveat:** the cache is per server process, resets on restart, and only
  shows auctions this app created/modified — not pre-existing contracts. When the
  operator ships the read fix, the live read becomes authoritative automatically
  (it's tried first); no code change is needed — the cache block can then be
  removed for a leaner adapter.
- **Custodial.** All parties on the hosted node share the validator's namespace
  signing key, so commands act under the shared operator party, not a key-unique
  party. This is a usability path, not per-tenant isolation — that requires an
  operator-side per-party Canton user bound to your key.

## Notes

- **Design system.** The components under `lib/ui/` are **vendored** (copied)
  from `@tenzro/ui` in the `tenzro-wallet` repo so this sample is self-contained;
  that upstream package is not modified. Re-copy to pick up design changes.
- **Mock state is per-process** and resets on dev-server restart.
- `bun run typecheck` / `bun run build` both pass clean.
