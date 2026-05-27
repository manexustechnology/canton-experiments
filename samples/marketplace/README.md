# Marketplace (Delivery-vs-Payment)

A two-party trade where an `Asset` and a `Cash` payment change hands **atomically** inside a single Daml choice. This is the canonical *delivery-versus-payment* (DvP) pattern that motivates a lot of Daml-based capital-markets work.

## Templates

- **`Asset`** (`Asset.daml`) — `signatory issuer, owner`. Has a free-form `description`. Owner + new owner can co-sign a transfer.
- **`Cash`** (`Cash.daml`) — `signatory issuer, owner`. Has `currency` and `amount`. Owner + new owner can co-sign a transfer.
- **`TradeProposal`** (`Trade.daml`) — seller publishes; buyer accepts by supplying a `Cash` contract that matches `currency` and `price`. The accept choice exercises both transfers in one transaction, so the trade is all-or-nothing.

## Why this pattern matters

Without DvP, you have to send the asset *or* the cash first and trust the counterparty to follow through. The Daml ledger executes a choice atomically, so a single exercise either succeeds with both legs settled or fails with neither side moving — eliminating principal risk.

## Choices

| Template            | Choice                       | Controller(s)       | Effect                                                                              |
|---------------------|------------------------------|---------------------|-------------------------------------------------------------------------------------|
| `Asset`             | `Asset_Transfer`             | `owner`, `newOwner` | Re-issues the asset to the new owner.                                               |
| `Cash`              | `Cash_Transfer`              | `owner`, `newOwner` | Re-issues the cash to the new owner.                                                |
| `TradeProposal`     | `TradeProposal_Accept`       | `buyer`             | Atomically swaps asset for cash (validates currency + amount + cash ownership).     |
| `TradeProposal`     | `TradeProposal_Reject`       | `buyer`             | Cancels the proposal.                                                               |
| `TradeProposal`     | `TradeProposal_Withdraw`     | `seller`            | Seller withdraws the proposal.                                                      |

## What this sample demonstrates

- Atomic multi-asset settlement in a single choice
- Multi-controller choices (transfer needs both old and new owner)
- Composing exercises across templates inside a single transaction

## Run

```bash
daml build
daml start
```

The setup script allocates `CentralBank`, `AssetRegistry`, `Alice` (seller) and `Bob` (buyer); the registry issues Alice a painting; the central bank issues Bob $500; Alice posts a trade proposal at $500; Bob accepts, and the swap clears.
