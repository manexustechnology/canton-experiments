/**
 * BidPanel — the bidder's surface. Exercises the `PlaceBid` choice. The
 * UI pre-validates against the same floor the contract enforces (must
 * strictly exceed the current high, or the reserve if there are no bids
 * yet) so the common rejection never round-trips, but the ledger remains
 * the authority — a stale floor still bounces server-side.
 */

'use client';

import { Crown, Gavel } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { useParty } from '@/components/providers';
import { bidFloor, roleOf, statusOf } from '@/lib/auction-view';
import { usePlaceBid } from '@/lib/client/hooks';
import type { AuctionContract } from '@/lib/daml/types';
import { AmountInput, Button, Card, CardContent, CardHeader, CardTitle, formatNumeric } from '@/lib/ui';

export function BidPanel({ auction }: { auction: AuctionContract }) {
  const { party } = useParty();
  const placeBid = usePlaceBid();
  const [value, setValue] = React.useState('');

  const role = roleOf(auction, party);
  const floor = bidFloor(auction);
  const open = statusOf(auction) === 'open';

  if (!role.isBidder) {
    return (
      <Card variant="raised">
        <CardContent className="pt-5 text-sm text-foreground-muted">
          You're not on the invited-bidder list for this lot. Switch to an invited party
          (Alice, Bob, or Charlie) in the top-right to bid.
        </CardContent>
      </Card>
    );
  }

  const numeric = Number.parseFloat(value);
  const valid = !Number.isNaN(numeric) && numeric > floor;
  const suggestion = (floor + 5).toFixed(2);

  async function submit() {
    if (!valid) return;
    try {
      await placeBid.mutateAsync({ contractId: auction.contractId, price: numeric.toFixed(2) });
      toast.success(`Bid placed at ${formatNumeric(numeric.toFixed(2))}`);
      setValue('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Card variant="raised">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="size-4 text-brand" /> Place a bid
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {role.isHighBidder && (
          <div className="flex items-center gap-2 rounded-xl bg-success-soft border border-success/20 px-3 py-2 text-sm text-success">
            <Crown className="size-4" /> You hold the high bid.
          </div>
        )}

        <AmountInput
          symbol="CC"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          available={suggestion}
          onMax={() => setValue(suggestion)}
          usdValue={value && valid ? formatNumeric(numeric.toFixed(2)) : undefined}
        />

        <p className="text-xs text-foreground-muted">
          Must exceed{' '}
          <span className="tabular text-foreground">{formatNumeric(floor.toFixed(2))} CC</span>{' '}
          {auction.payload.highBid ? '(current high bid)' : '(reserve price)'}.
        </p>

        <Button
          width="full"
          onClick={submit}
          disabled={!open || !valid}
          pending={placeBid.isPending}
        >
          {open ? 'Submit bid' : 'Auction closed'}
        </Button>
      </CardContent>
    </Card>
  );
}
