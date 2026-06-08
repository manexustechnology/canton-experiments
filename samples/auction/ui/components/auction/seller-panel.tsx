/**
 * SellerPanel — the auctioneer's surface. Before close, the seller can
 * `Extend` the deadline; after close, they `Settle` to reveal the
 * winning BidInfo (and archive the contract). Mirrors the seller-only
 * choices on the Auction template.
 */

'use client';

import { CalendarClock, Hammer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { statusOf } from '@/lib/auction-view';
import { useExtend, useSettle } from '@/lib/client/hooks';
import type { AuctionContract } from '@/lib/daml/types';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, formatNumeric, formatParty } from '@/lib/ui';

const EXTEND_OPTIONS = [15, 30, 60] as const;

export function SellerPanel({ auction }: { auction: AuctionContract }) {
  const router = useRouter();
  const settle = useSettle();
  const extend = useExtend();
  const open = statusOf(auction) === 'open';

  async function onSettle() {
    try {
      const { winner } = await settle.mutateAsync(auction.contractId);
      if (winner) {
        toast.success(`Settled — ${formatParty(winner.bidder)} wins at ${formatNumeric(winner.price)} CC`);
      } else {
        toast.message('Settled — no bid cleared the reserve');
      }
      // The contract is archived on settle; return to the gallery.
      router.push('/');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onExtend(minutes: number) {
    try {
      await extend.mutateAsync({ contractId: auction.contractId, minutes });
      toast.success(`Deadline extended by ${minutes} minutes`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Card variant="raised">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hammer className="size-4 text-brand" /> Auctioneer controls
        </CardTitle>
        <CardDescription>You're the seller of this lot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {open ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-subtle font-semibold mb-2 flex items-center gap-1.5">
              <CalendarClock className="size-3.5" /> Extend deadline
            </p>
            <div className="flex gap-2">
              {EXTEND_OPTIONS.map((m) => (
                <Button
                  key={m}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => onExtend(m)}
                  pending={extend.isPending && extend.variables?.minutes === m}
                >
                  +{m}m
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-foreground-muted">
              Settling unlocks once the deadline passes.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-foreground-muted mb-3">
              The auction has closed. Settle to award the lot to the highest bidder and archive
              the contract.
            </p>
            <Button width="full" onClick={onSettle} pending={settle.isPending} leftIcon={<Hammer className="size-4" />}>
              Settle auction
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
