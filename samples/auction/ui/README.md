# Auction House — Next.js front-end for the Canton/DAML `Auction` sample

A web app for the [`Auction`](../daml/Auction.daml) DAML contract: list lots,
place ascending-price bids, extend, and settle — on the Canton ledger, with the
[Tenzro](https://tenzro.com) design system on top.

It runs **out of the box against a built-in mock ledger** (no Canton node
needed), and switches to a **real Canton participant** via one env var. The live
client is a TypeScript port of Tenzro's own `CantonAdapter`, so the wire format
is identical to what Tenzro validators speak.

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
│  │  ├─ canton-adapter.ts   # live client — port of tenzro-bridge CantonAdapter
│  │  └─ config.ts           # CantonConfig-shaped env wiring
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

## Notes

- **Design system.** The components under `lib/ui/` are **vendored** (copied)
  from `@tenzro/ui` in the `tenzro-wallet` repo so this sample is self-contained;
  that upstream package is not modified. Re-copy to pick up design changes.
- **Mock state is per-process** and resets on dev-server restart.
- `bun run typecheck` / `bun run build` both pass clean.
