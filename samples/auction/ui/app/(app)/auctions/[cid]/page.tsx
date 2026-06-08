/**
 * Lot detail — the full view of a single Auction contract: item, current
 * high bid, invited bidders, a live countdown, and the role-appropriate
 * action panel (bid for bidders, settle/extend for the seller).
 */

'use client';

import { ArrowLeft, Clock, Crown, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Countdown } from '@/components/auction/countdown';
import { BidPanel } from '@/components/auction/bid-panel';
import { SellerPanel } from '@/components/auction/seller-panel';
import { StatusPill } from '@/components/auction/status-pill';
import { useParty } from '@/components/providers';
import { bidFloor, roleOf, statusOf } from '@/lib/auction-view';
import { useAuction } from '@/lib/client/hooks';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChainBadge,
  Separator,
  buttonVariants,
  formatNumeric,
  formatParty,
} from '@/lib/ui';

export default function LotDetailPage() {
  const params = useParams<{ cid: string }>();
  const cid = params.cid;
  const { party } = useParty();
  const { auction, isLoading, isError } = useAuction(cid);

  if (isLoading) {
    return <div className="h-64 rounded-2xl skeleton" />;
  }

  if (isError || !auction) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card variant="raised">
          <CardContent className="pt-6 text-sm text-foreground-muted">
            This lot isn't in your view. It may have been settled (and archived), or it was never
            listed to <span className="text-foreground font-medium">{party}</span>. Try switching
            identity in the top-right.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { payload } = auction;
  const role = roleOf(auction, party);
  const open = statusOf(auction) === 'open';
  const hasBid = payload.highBid !== null;

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: the lot */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ChainBadge size="sm" />
              <StatusPill auction={auction} />
              {role.isSeller && <Badge size="sm">Your lot</Badge>}
              {role.isHighBidder && (
                <Badge variant="success" size="sm">
                  <Crown className="size-3" /> You're winning
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{payload.itemDescription}</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Listed by {formatParty(payload.seller)}
            </p>
          </div>

          <Card variant="raised">
            <CardContent className="pt-5 grid grid-cols-2 gap-5">
              <Figure
                label={hasBid ? 'Current high bid' : 'Reserve price'}
                value={`${formatNumeric(hasBid ? payload.highBid!.price : payload.reservePrice)} CC`}
                sub={hasBid ? `by ${formatParty(payload.highBid!.bidder)}` : 'no bids yet'}
              />
              <Figure
                label="Next valid bid"
                value={`> ${formatNumeric(bidFloor(auction).toFixed(2))} CC`}
                sub={`reserve ${formatNumeric(payload.reservePrice)} CC`}
              />
              <div className="col-span-2">
                <Separator className="my-1" />
              </div>
              <Figure
                label={open ? 'Time left' : 'Closed'}
                value={<Countdown closesAt={payload.closesAt} />}
                icon={<Clock className="size-3.5" />}
              />
              <Figure
                label="Closes at"
                value={<span className="tabular text-sm">{new Date(payload.closesAt).toLocaleString()}</span>}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-foreground-muted" /> Invited bidders
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {payload.bidders.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2.5 h-7 text-xs"
                >
                  {formatParty(b)}
                  {payload.highBid?.bidder === b && <Crown className="size-3 text-success" />}
                </span>
              ))}
            </CardContent>
          </Card>

          <p className="text-[11px] text-foreground-disabled font-mono break-all">
            contract · {auction.contractId}
          </p>
        </div>

        {/* Right: the action panel for this party's role */}
        <div className="space-y-4">
          {role.isSeller ? <SellerPanel auction={auction} /> : <BidPanel auction={auction} />}
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
      <ArrowLeft className="size-4" /> All lots
    </Link>
  );
}

function Figure({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-foreground-subtle font-semibold flex items-center gap-1">
        {icon} {label}
      </p>
      <div className="tabular text-xl font-semibold text-foreground mt-1">{value}</div>
      {sub && <p className="text-xs text-foreground-muted mt-0.5">{sub}</p>}
    </div>
  );
}
