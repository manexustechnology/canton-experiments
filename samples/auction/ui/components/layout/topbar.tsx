/**
 * Topbar — page chrome with the ledger-mode badge on the left and the
 * party switcher on the right. Sticky so the acting identity is always
 * one click away while scrolling a long lot.
 */

'use client';

import Link from 'next/link';

import { Logo } from '@/lib/ui';
import { LedgerBadge } from './ledger-badge';
import { PartySwitcher } from './party-switcher';

export function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-background/70 backdrop-blur-xl px-6 lg:px-8 h-16">
      <Link href="/" className="lg:hidden inline-flex items-center gap-2">
        <Logo size={24} />
      </Link>
      <div className="hidden sm:block">
        <LedgerBadge />
      </div>
      <div className="flex-1" />
      <PartySwitcher />
    </header>
  );
}
