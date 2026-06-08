/**
 * Display formatters. `formatRelativeTime` is vendored from @tenzro/ui
 * (utils/format.ts); the currency/number helpers below are tailored to
 * the auction's `Numeric 2` amounts.
 */

export function formatRelativeTime(date: Date | number): string {
  const ms = (typeof date === 'number' ? date : date.getTime()) - Date.now();
  const abs = Math.abs(ms);
  const sec = Math.round(ms / 1000);
  const min = Math.round(ms / 60_000);
  const hr = Math.round(ms / 3_600_000);
  const day = Math.round(ms / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto', style: 'short' });
  if (abs < 60_000) return rtf.format(sec, 'second');
  if (abs < 3_600_000) return rtf.format(min, 'minute');
  if (abs < 86_400_000) return rtf.format(hr, 'hour');
  return rtf.format(day, 'day');
}

/** Format a `Numeric 2` decimal string as a grouped currency-ish value. */
export function formatNumeric(value: string): string {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatParty(party: string): string {
  // On a real participant the party id can be long + namespaced; keep
  // the readable hint and elide a trailing fingerprint.
  if (party.length <= 18) return party;
  return `${party.slice(0, 10)}…${party.slice(-4)}`;
}
