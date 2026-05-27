# Property

A property-ownership ledger model. A `PropertyService` party manages accounts that each represent ownership of a specific off-chain document (e.g. a deed referenced via `contractLink`) and an on-chain `Numeric 2` balance attached to it.

## Templates

- **`PropertyAccount`** — signed by the service, observed by the property owner. Holds `contractLink` (a URL/CID to the underlying document) and a `balance`. Keyed on `(service, propertyOwner)`.
- **`PropertyService`** — a role contract held by the service, listing the property owners under its administration.

## Choices

| Template            | Choice                   | Controller        | Effect                                                                          |
|---------------------|--------------------------|-------------------|---------------------------------------------------------------------------------|
| `PropertyAccount`   | `Deposit`                | `propertyOwner`   | Credits balance.                                                                |
| `PropertyAccount`   | `Withdraw`               | `propertyOwner`   | Debits balance (fails on insufficient funds).                                   |
| `PropertyAccount`   | `TransferBalance`        | `service`         | Atomically debits one account and credits another (both keyed by service).      |
| `PropertyService`   | `CreatePropertyAccount`  | `service`         | Creates a property account for an owner (idempotent on key).                    |
| `PropertyService`   | `RewardPropertyOwner`    | `service`         | Credits an existing account by a reward amount.                                 |

## What this sample demonstrates

- Linking on-ledger state (`balance`) to off-ledger artefacts (`contractLink`)
- Service-controlled transfers between two party-keyed accounts
- A role contract administering many per-owner accounts

## Run

```bash
daml build
daml start
```

The setup script allocates a service party plus three owners, creates a property account for each with a placeholder `ipfs://…-deed` link, deposits into Alice's, then has the service transfer part of her balance to Bob.
