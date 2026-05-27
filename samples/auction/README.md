# Auction

An open, ascending-price auction. A `seller` lists an item with a `reservePrice` and a `closesAt` deadline. Invited `bidders` place bids that must strictly exceed the current high (or the reserve, for the first bid). After the deadline the seller calls `Settle` and the highest bid wins.

## Templates

- **`Auction`** — `signatory seller`, `observer bidders`. Tracks `itemDescription`, `reservePrice`, `closesAt` and the current `highBid` (an `Optional BidInfo`).

## Choices

| Choice       | Controller                | Effect                                                                                |
|--------------|---------------------------|---------------------------------------------------------------------------------------|
| `PlaceBid`   | the bidder                | Requires `now < closesAt`, bidder is invited, and `price > current high (or reserve)`. Updates `highBid`. |
| `Settle`     | `seller`                  | Requires `now >= closesAt`. Returns the winning `BidInfo` (or `None`).                |
| `Extend`     | `seller`                  | Pushes `closesAt` further out by a `RelTime`; only allowed before close.              |

## What this sample demonstrates

- **Ledger time** in choice bodies (`getTime`) and `passTime` in scripts
- Choice **preconditions** that depend on time (`now < closesAt`)
- Stateful contracts (the `highBid` is updated by recreating the `Auction`)
- A simple algebraic data type (`BidInfo`) as part of contract state and as a choice return type

## Run

```bash
daml build
daml start
```

The setup script lists an item with a $50 reserve and a 1-hour window, has Alice/Bob/Charlie bid $60 / $75 / $90, advances script time past close, and settles. The winning `BidInfo` (Charlie at $90) is printed via `debug`.
