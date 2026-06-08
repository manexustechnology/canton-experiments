/**
 * StatusPill — open / closed chip. A closed lot is "Awaiting settlement"
 * until the seller exercises Settle (at which point it leaves the ACS
 * and disappears from the gallery).
 */

'use client';

import { CircleDot, Clock } from 'lucide-react';

import type { AuctionContract } from '@/lib/daml/types';
import { statusOf } from '@/lib/auction-view';
import { Badge } from '@/lib/ui';

export function StatusPill({ auction }: { auction: AuctionContract }) {
  // statusOf is time-based; computing it at render is fine for a chip
  // that re-renders on the list's 5s poll.
  const open = statusOf(auction) === 'open';
  return open ? (
    <Badge variant="info" size="sm">
      <CircleDot className="size-3" /> Open
    </Badge>
  ) : (
    <Badge variant="warning" size="sm">
      <Clock className="size-3" /> Awaiting settlement
    </Badge>
  );
}
