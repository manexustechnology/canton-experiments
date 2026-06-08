/**
 * AuctionCard — one lot in the gallery. Shows the current high bid (or
 * reserve), a live countdown, the status, and a hint of the viewer's
 * role (you're the seller / you're winning / outbid).
 */

'use client';

import { ArrowRight, Crown, Gavel } from 'lucide-react';
import Link from 'next/link';

import { useParty } from '@/components/providers';
import type { AuctionContract } from '@/lib/daml/types';
import { bidFloor, roleOf } from '@/lib/auction-view';
import { Card, ChainBadge, cn, formatNumeric, formatParty } from '@/lib/ui';
import { Countdown } from './countdown';
import { StatusPill } from './status-pill';

export function AuctionCard({ auction }: { auction: AuctionContract }) {
  const { party } = useParty();
  const { payload } = auction;
  const role = roleOf(auction, party);
  const hasBid = payload.highBid !== null;

  return (
    <Link href={`/auctions/${auction.contractId}`} className="block group">
      <Card variant="raised" interactive className="h-full overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <ChainBadge size="sm" />
          <StatusPill auction={auction} />
        </div>

        <div className="px-5 pt-3">
          <h3 className="text-base font-semibold tracking-tight text-foreground line-clamp-2">
            {payload.itemDescription}
          </h3>
          <p className="mt-1 text-xs text-foreground-subtle">
            Seller {formatParty(payload.seller)} · {payload.bidders.length} invited
          </p>
        </div>

        <div className="px-5 pt-4 pb-3 mt-3 border-t border-border-subtle flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-foreground-subtle font-semibold">
              {hasBid ? 'High bid' : 'Reserve'}
            </p>
            <p className="tabular text-xl font-semibold text-foreground mt-0.5">
              {formatNumeric(hasBid ? payload.highBid!.price : payload.reservePrice)}
            </p>
            {hasBid && (
              <p className="text-xs text-foreground-muted mt-0.5">
                by {formatParty(payload.highBid!.bidder)}
              </p>
            )}
            {!hasBid && (
              <p className="text-xs text-foreground-muted mt-0.5">
                floor {formatNumeric(String(bidFloor(auction)))} · no bids yet
              </p>
            )}
          </div>

          <div className="text-right">
            <Countdown closesAt={payload.closesAt} className="text-xs" />
            <div className="mt-1.5 flex items-center justify-end gap-1.5 text-xs font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ArrowRight className="size-3.5" />
            </div>
          </div>
        </div>

        {(role.isSeller || role.isHighBidder || (role.isBidder && hasBid && !role.isHighBidder)) && (
          <div className="px-5 pb-4">
            <RoleHint
              isSeller={role.isSeller}
              isHighBidder={role.isHighBidder}
              isOutbid={role.isBidder && hasBid && !role.isHighBidder}
            />
          </div>
        )}
      </Card>
    </Link>
  );
}

function RoleHint({
  isSeller,
  isHighBidder,
  isOutbid,
}: {
  isSeller: boolean;
  isHighBidder: boolean;
  isOutbid: boolean;
}) {
  if (isSeller) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
        <Gavel className="size-3.5" /> You're the auctioneer
      </span>
    );
  }
  if (isHighBidder) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success">
        <Crown className="size-3.5" /> You're winning
      </span>
    );
  }
  if (isOutbid) {
    return <span className={cn('text-xs text-warning')}>You've been outbid</span>;
  }
  return null;
}
