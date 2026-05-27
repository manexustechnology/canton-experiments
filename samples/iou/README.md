# IOU (Simple Token)

The canonical Daml intro example. An `Iou` ("I owe you") is a promise from an `issuer` to pay an `owner` a certain `amount` of a given `currency`. Both parties co-sign — the issuer is bound, the owner holds the asset.

## Templates

- **`Iou`** — `signatory issuer, owner`. Carries `currency` and `amount`. Owner can split, merge, or propose to transfer it.
- **`IouTransferProposal`** — propose-accept wrapper. The current owner creates it naming a `newOwner`; the new owner accepts and the IOU is reissued in their name.

## Choices

| Template                | Choice                          | Controller   | Effect                                                                  |
|-------------------------|---------------------------------|--------------|-------------------------------------------------------------------------|
| `Iou`                   | `ProposeTransfer`               | `owner`      | Creates an `IouTransferProposal` for `newOwner`.                        |
| `Iou`                   | `Split`                         | `owner`      | Splits one IOU into two of `splitAmount` and the remainder.             |
| `Iou`                   | `Merge`                         | `owner`      | Merges two IOUs with matching `issuer`/`currency`/`owner` into one.     |
| `IouTransferProposal`   | `IouTransferProposal_Accept`    | `newOwner`   | Reissues the IOU in the new owner's name.                               |
| `IouTransferProposal`   | `IouTransferProposal_Reject`    | `newOwner`   | Cancels the proposal.                                                   |
| `IouTransferProposal`   | `IouTransferProposal_Withdraw`  | `iou.owner`  | Current owner withdraws the proposal.                                   |

## What this sample demonstrates

- The **propose-accept** pattern (the foundational Daml authorization idiom)
- Multi-signatory templates: both `issuer` and `owner` must authorize creation
- `submitMulti` to submit a command authorized by multiple parties
- Split / merge operations on fungible-style assets

## Run

```bash
daml build
daml start
```

The setup script has the bank issue Alice a $100 IOU, Alice splits it into $30 + $70, transfers the $30 to Bob (propose → accept), then merges another $50 issuance into the $70 piece for a final $120 holding.
