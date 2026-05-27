# Bank

A minimal retail-banking model. A `Bank` party operates accounts on behalf of customers and mediates transfers between them.

## Templates

- **`BankAccount`** — signed by the bank, observed by the account owner. Carries a `Numeric 2` balance and uses `(bank, accountOwner)` as a contract key so accounts are unique per (bank, customer) pair.
- **`BankService`** — a role contract held by the bank, listing the customers it serves.

## Choices

| Template       | Choice           | Controller       | Effect                                                                 |
|----------------|------------------|------------------|------------------------------------------------------------------------|
| `BankAccount`  | `Deposit`        | `accountOwner`   | Credits the balance.                                                   |
| `BankAccount`  | `Withdraw`       | `accountOwner`   | Debits the balance (fails on insufficient funds).                      |
| `BankAccount`  | `Transfer`       | `bank`           | Atomically debits sender, credits receiver (looked up by contract key).|
| `BankService`  | `OpenAccount`    | `bank`           | Creates a zero-balance `BankAccount` for a customer (idempotent).      |
| `BankService`  | `PayReward`      | `bank`           | Credits an existing account by a reward amount.                        |
| `BankService`  | `TransferAtoB`   | `bank`           | Same as `Transfer` but invoked by the service, given two party names.  |

## What this sample demonstrates

- Signatory / observer / controller separation
- Contract keys and `lookupByKey` / `fetchByKey`
- Atomic multi-contract updates within a single choice
- A role contract (`BankService`) coordinating per-customer state contracts (`BankAccount`)

## Run

```bash
daml build      # compile to a .dar
daml start      # start a sandbox, run Main:setup, launch the JSON API + Navigator
```

The setup script in `daml/Main.daml` allocates `Bank`, `Alice`, `Bob`, `Charlie`, opens accounts for the three customers, seeds Alice with 1000, and transfers 250 to Bob.
