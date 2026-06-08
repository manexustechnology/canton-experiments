/**
 * Sidebar — vertical nav. Mirrors the wallet's sidebar pattern: grouped
 * links with a Motion-driven active pill that slides between items.
 */

'use client';

import { Building2, Gavel, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo, cn } from '@/lib/ui';

const groups = [
  {
    label: 'Auction house',
    items: [
      { href: '/', label: 'Lots', icon: Gavel, exact: true },
      { href: '/create', label: 'List an item', icon: Plus, exact: false },
    ],
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border-subtle bg-background/40 backdrop-blur-xl px-3 py-5 sticky top-0 h-dvh">
      <Link href="/" className="px-2 mb-6 inline-flex items-center gap-2">
        <Logo size={26} />
        <span className="text-sm font-semibold tracking-tight">Auction House</span>
      </Link>

      <nav className="flex flex-col gap-6 flex-1">
        {groups.map((group) => (
          <div key={group.label}>
            <h3 className="px-2 mb-2 text-[10px] uppercase tracking-widest text-foreground-subtle font-semibold">
              {group.label}
            </h3>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : (pathname?.startsWith(item.href) ?? false);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-foreground'
                        : 'text-foreground-muted hover:text-foreground hover:bg-surface-2',
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-surface-2 border border-border-subtle"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className="size-4 relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-3 rounded-xl border border-border-subtle bg-surface-1 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
          <Building2 className="size-3 text-surface-canton" />
          <span>Settled on Canton / DAML</span>
        </div>
      </div>
    </aside>
  );
}
