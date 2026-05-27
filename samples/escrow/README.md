# Escrow (Three-party Agreement)

A three-party escrow workflow: `buyer`, `seller`, and a neutral `agent`. The buyer commits funds to a contract that only the agent can resolve — either to release the funds to the seller (delivery confirmed) or to refund the buyer (delivery failed). The agent never owns the funds; they only hold the right to choose the settlement outcome.

## State machine

```
EscrowProposal  ── buyer  signs ──▶  observer: seller, agent
        │
        │  seller exercises AcceptBySeller
        ▼
EscrowAwaitingAgent  ── buyer + seller sign ──▶  observer: agent
        │
        │  agent exercises AcceptByAgent
        ▼
Escrow  (funds locked under agent's discretion)
        │
        ├── agent exercises Release  ──▶  SettlementReceipt (ReleasedToSeller)
        └── agent exercises Refund   ──▶  SettlementReceipt (RefundedToBuyer)
```

## Templates

- **`EscrowProposal`** — signed by `buyer`, observed by `seller` and `agent`.
- **`EscrowAwaitingAgent`** — co-signed by `buyer` and `seller`, observed by `agent`.
- **`Escrow`** — the live escrow contract; signatories are buyer + seller, the agent decides the outcome.
- **`SettlementReceipt`** — an immutable record of the resolution (`ReleasedToSeller` or `RefundedToBuyer`).

## Choices

| Template                | Choice                              | Controller   | Effect                                                              |
|-------------------------|-------------------------------------|--------------|---------------------------------------------------------------------|
| `EscrowProposal`        | `EscrowProposal_AcceptBySeller`     | `seller`     | Moves the workflow to `EscrowAwaitingAgent`.                        |
| `EscrowProposal`        | `EscrowProposal_Reject`             | `seller`     | Drops the proposal.                                                 |
| `EscrowProposal`        | `EscrowProposal_Withdraw`           | `buyer`      | Buyer withdraws.                                                    |
| `EscrowAwaitingAgent`   | `EscrowAwaitingAgent_AcceptByAgent` | `agent`      | Activates the `Escrow`.                                             |
| `EscrowAwaitingAgent`   | `EscrowAwaitingAgent_Cancel`        | `agent`      | Agent declines to take the role.                                    |
| `Escrow`                | `Release`                           | `agent`      | Funds released to seller; creates `SettlementReceipt (Released…)`.  |
| `Escrow`                | `Refund`                            | `agent`      | Funds refunded to buyer; creates `SettlementReceipt (Refunded…)`.   |

## What this sample demonstrates

- A multi-step **propose-accept-accept** workflow with three principals
- Using template *states* to model workflow steps (`Proposal` → `AwaitingAgent` → `Escrow`)
- A neutral controller (`agent`) holding settlement rights without becoming a signatory of the value-bearing record
- Immutable audit trails via a final `SettlementReceipt`

## Run

```bash
daml build
daml start
```

The setup script walks the happy path end-to-end: buyer proposes a $1500 escrow → seller accepts → agent accepts → agent releases on delivery confirmation.

## Extending

This sample tracks the *workflow* but not the *cash*. To make it production-shaped, wire `Release` and `Refund` to exercise a transfer on a `Cash` contract (see the `marketplace` sample for a transferable Cash template).
