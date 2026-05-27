# Canton Experiments — Daml Sample Contracts

A small library of self-contained Daml sample projects. Each folder under [`samples/`](./samples) is an independent Daml project that compiles and runs on its own — handy for picking up a single pattern without wading through the others.

All samples target **Daml SDK 3.4.11** (Canton 3 / Daml-LF 2.x line).

## Samples

| Folder                                             | Pattern                                          | What it shows                                                                  |
|----------------------------------------------------|--------------------------------------------------|--------------------------------------------------------------------------------|
| [`samples/bank`](./samples/bank)                   | Role contract + per-customer state contracts     | Signatory/observer separation, contract keys, atomic transfers.                |
| [`samples/property`](./samples/property)           | Same shape, applied to property ownership        | Linking on-ledger balance to off-ledger documents via a `contractLink`.        |
| [`samples/iou`](./samples/iou)                     | The classic IOU / fungible token                 | Propose-accept transfer, multi-signatory issuance, split / merge.              |
| [`samples/marketplace`](./samples/marketplace)     | Delivery-vs-payment (atomic swap)                | Asset + Cash exchanged in a single choice — no principal risk.                 |
| [`samples/auction`](./samples/auction)             | Open ascending-price auction                     | Ledger time, time-gated choices, stateful contract evolution.                  |
| [`samples/escrow`](./samples/escrow)               | Three-party escrow                               | Multi-step propose-accept-accept workflow with a neutral settlement agent.     |

## Prerequisites

Install the Daml SDK 3.4.11. The recommended way is via the Digital Asset Package Manager (`dpm`):

```bash
curl -sSL https://get.daml.com/ | sh -s 3.4.11
```

or follow the official installer at <https://docs.digitalasset.com/build/3.4>.

Verify:

```bash
daml version
```

## Build & run a sample

Every sample is a standard Daml project. From the repo root:

```bash
cd samples/<name>
daml build       # compiles to .daml/dist/<name>-0.1.0.dar
daml start       # starts sandbox, runs Main:setup, launches JSON API + Navigator
```

`daml start` opens Navigator on <http://localhost:7500> so you can inspect the contracts that the setup script created.

To just type-check without launching the ledger:

```bash
daml build
```

To run only the setup script against a sandbox:

```bash
daml sandbox &
daml script --dar .daml/dist/<name>-0.1.0.dar --script-name Main:setup --ledger-host localhost --ledger-port 6865
```

## Layout

```
canton-experiments/
├── README.md                ← this file
├── .dlint.yaml              ← shared linter config
└── samples/
    ├── bank/                ┐
    │   ├── daml.yaml        │  each folder is a self-contained
    │   ├── daml/            │  Daml project; rename / fork freely
    │   │   ├── Main.daml    │
    │   │   └── Bank.daml    │
    │   └── README.md        ┘
    ├── property/
    ├── iou/
    ├── marketplace/
    ├── auction/
    └── escrow/
```

## Adding a new sample

1. `cp -r samples/iou samples/<your-sample>` (IOU is the smallest template to start from).
2. Edit `daml.yaml` — update the `name:` field.
3. Replace the modules under `daml/` with your contracts.
4. Update `daml/Main.daml`'s `setup` script to allocate parties and exercise a happy path.
5. Replace the `README.md`.
6. Add a row to the table above.
