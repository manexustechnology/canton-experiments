/**
 * PartySwitcher — pick which of the four allocated parties you're acting
 * as. This is the auction-house analogue of the wallet's identity
 * switcher: every ledger call is submitted on behalf of the selected
 * party, so switching here changes what you can see and do (a bidder
 * can bid; the seller can settle/extend).
 */

'use client';

import { Check, ChevronDown, UserRound } from 'lucide-react';
import * as React from 'react';

import { PARTIES, type PartyName, useParty } from '@/components/providers';
import { cn } from '@/lib/ui';

export function PartySwitcher() {
  const { party, setParty } = useParty();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border-default bg-surface-1 pl-2 pr-2.5 h-9',
          'text-sm font-medium text-foreground hover:bg-surface-2 hover:border-border-strong transition-colors cursor-pointer',
        )}
      >
        <span className="grid place-items-center size-5 rounded-md bg-brand-soft text-brand">
          <UserRound className="size-3" />
        </span>
        <span>Acting as {party}</span>
        <ChevronDown className={cn('size-3.5 text-foreground-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border-default bg-background-elevated p-1 shadow-xl z-20">
          <p className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-foreground-subtle font-semibold">
            Allocated parties
          </p>
          {PARTIES.map((p: PartyName) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setParty(p);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer',
                p === party ? 'bg-surface-2 text-foreground' : 'text-foreground-muted hover:bg-surface-2 hover:text-foreground',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{p}</span>
                {p === 'Seller' && (
                  <span className="text-[10px] text-foreground-subtle">auctioneer</span>
                )}
              </span>
              {p === party && <Check className="size-3.5 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
