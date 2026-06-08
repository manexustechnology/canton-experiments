/**
 * Lots gallery — the auction house front page. Shows every Auction
 * contract in the active set that the current party can see (as seller
 * or invited bidder), plus a few headline stats.
 */

'use client';

import { Gavel, Hammer, Plus, Timer, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { AuctionCard } from '@/components/auction/auction-card';
import { useParty } from '@/components/providers';
import { statusOf } from '@/lib/auction-view';
import { useAuctions } from '@/lib/client/hooks';
import { EmptyState, KeyStat, buttonVariants } from '@/lib/ui';

export default function LotsPage() {
  const { party } = useParty();
  const { data, isLoading, isError, error } = useAuctions();
  const auctions = data?.auctions ?? [];

  const open = auctions.filter((a) => statusOf(a) === 'open');
  const closing = open.filter((a) => Date.parse(a.payload.closesAt) - Date.now() < 30 * 60_000);
  const awaiting = auctions.filter((a) => statusOf(a) === 'closed');

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Auction house</h1>
          <p className="text-foreground-muted">
            Open ascending-price lots on Canton. You're browsing as{' '}
            <span className="text-foreground font-medium">{party}</span>.
          </p>
        </div>
        <Link href="/create" className={buttonVariants()}>
          <Plus className="size-4" /> List an item
        </Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KeyStat label="Visible lots" value={auctions.length.toString()} icon={Gavel} accent="brand" />
        <KeyStat label="Open now" value={open.length.toString()} icon={TrendingUp} accent="success" />
        <KeyStat label="Closing < 30m" value={closing.length.toString()} icon={Timer} accent="canton" />
        <KeyStat label="Awaiting settle" value={awaiting.length.toString()} icon={Hammer} accent="brand" />
      </div>

      {isLoading && <GallerySkeleton />}

      {isError && (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger">
          Couldn't load auctions: {(error as Error)?.message}
        </div>
      )}

      {!isLoading && !isError && auctions.length === 0 && (
        <EmptyState
          icon={Gavel}
          title="No lots you can see"
          description={`Nothing is listed to ${party} yet. List an item, or switch identity in the top-right to view another party's lots.`}
        >
          <Link href="/create" className={buttonVariants({ variant: 'secondary' })}>
            <Plus className="size-4" /> List the first lot
          </Link>
        </EmptyState>
      )}

      {auctions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {auctions.map((a) => (
            <AuctionCard key={a.contractId} auction={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-48 rounded-2xl skeleton" />
      ))}
    </div>
  );
}
