/**
 * ChainBadge + ChainLogo — chain-identity primitives. Vendored from
 * @tenzro/ui (wallet/chain-badge.tsx + wallet/chain.ts), trimmed to the
 * Canton chain since that's the only network this app surfaces. The
 * logo path data and brand color are copied verbatim from the Tenzro
 * chain registry.
 */

import * as React from 'react';
import { cn } from './cn';

export type ChainId = 'canton';

interface ChainMeta {
  name: string;
  color: string;
  /** SVG inner content, viewBox 0 0 24 24 */
  logo: string;
}

const CHAINS: Record<ChainId, ChainMeta> = {
  canton: {
    name: 'Canton',
    color: 'oklch(0.74 0.16 50)',
    logo: `<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 1 0 0 7" stroke="oklch(0.99 0 0)" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
};

export interface ChainLogoProps {
  chain?: ChainId;
  size?: number;
  className?: string;
}

export function ChainLogo({ chain = 'canton', size = 18, className }: ChainLogoProps) {
  const meta = CHAINS[chain];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ color: meta.color, width: size, height: size }}
      aria-label={meta.name}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: meta.logo }}
      />
    </span>
  );
}

export interface ChainBadgeProps {
  chain?: ChainId;
  size?: 'xs' | 'sm' | 'md';
  withName?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { h: 'h-5', text: 'text-[10px]', logo: 10, gap: 'gap-1', pad: 'px-1.5' },
  sm: { h: 'h-6', text: 'text-[11px]', logo: 12, gap: 'gap-1.5', pad: 'px-2' },
  md: { h: 'h-7', text: 'text-xs', logo: 14, gap: 'gap-1.5', pad: 'px-2.5' },
} as const;

export function ChainBadge({ chain = 'canton', size = 'sm', withName = true, className }: ChainBadgeProps) {
  const meta = CHAINS[chain];
  const s = sizeMap[size];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-surface-2 border border-border-subtle text-foreground-muted font-medium tracking-tight',
        s.h,
        s.text,
        s.gap,
        s.pad,
        className,
      )}
    >
      <ChainLogo chain={chain} size={s.logo} />
      {withName && <span>{meta.name}</span>}
    </span>
  );
}
