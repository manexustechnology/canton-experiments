/**
 * Countdown — live "closes in 12m 04s" / "closed 3m ago" readout driven
 * by the auction's `closesAt`. Ticks once a second on the client. The
 * underlying authority is still the ledger's `getTime` check; this is
 * just the visual clock so a bidder knows how long they have.
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/ui';

function format(ms: number): string {
  const abs = Math.abs(ms);
  const s = Math.floor(abs / 1000) % 60;
  const m = Math.floor(abs / 60_000) % 60;
  const h = Math.floor(abs / 3_600_000) % 24;
  const d = Math.floor(abs / 86_400_000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  if (d === 0 && h === 0) parts.push(`${s.toString().padStart(2, '0')}s`);
  return parts.join(' ');
}

export function Countdown({ closesAt, className }: { closesAt: string; className?: string }) {
  const target = React.useMemo(() => Date.parse(closesAt), [closesAt]);
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Render nothing time-sensitive until mounted (avoids hydration drift).
  if (now === null) return <span className={cn('tabular', className)}>—</span>;

  const diff = target - now;
  const open = diff > 0;
  return (
    <span className={cn('tabular', open ? 'text-foreground' : 'text-foreground-muted', className)}>
      {open ? `closes in ${format(diff)}` : `closed ${format(diff)} ago`}
    </span>
  );
}
