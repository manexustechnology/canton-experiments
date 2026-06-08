/**
 * Tailwind-aware classname merger. Combines clsx (conditional joins) with
 * tailwind-merge (last-write-wins for conflicting utility classes).
 *
 * Vendored from @tenzro/ui (tenzro-wallet/packages/ui/src/utils/cn.ts).
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
