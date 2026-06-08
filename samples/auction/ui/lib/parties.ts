/**
 * The four parties the auction sample's Main:setup allocates. Kept in a
 * dependency-free module so both server (route handlers) and client
 * (the party switcher) can import it.
 */

export const PARTIES = ['Seller', 'Alice', 'Bob', 'Charlie'] as const;
export type PartyName = (typeof PARTIES)[number];

export function isPartyName(value: string): value is PartyName {
  return (PARTIES as readonly string[]).includes(value);
}
