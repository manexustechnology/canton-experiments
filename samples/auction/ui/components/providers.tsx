/**
 * Providers — TanStack Query plus a tiny Party context.
 *
 * On a real Canton deployment the "acting party" is whoever your JWT
 * authorizes you to act as. Here we model the four parties the auction
 * sample's Main:setup allocates and let you switch between them, the way
 * the Tenzro wallet lets you switch identity. The chosen party rides
 * every ledger request as the `x-acting-party` header so the server
 * submits commands on its behalf.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

import { PARTIES, type PartyName, isPartyName } from '@/lib/parties';

interface PartyCtx {
  party: PartyName;
  setParty: (p: PartyName) => void;
}

const PartyContext = React.createContext<PartyCtx | null>(null);

export function useParty(): PartyCtx {
  const ctx = React.useContext(PartyContext);
  if (!ctx) throw new Error('useParty must be used within <Providers>');
  return ctx;
}

const STORAGE_KEY = 'tenzro.auction.party';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  const [party, setPartyState] = React.useState<PartyName>('Seller');

  // Restore last-used identity after hydration (avoids SSR mismatch).
  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isPartyName(saved)) setPartyState(saved);
  }, []);

  const setParty = React.useCallback((p: PartyName) => {
    setPartyState(p);
    window.localStorage.setItem(STORAGE_KEY, p);
  }, []);

  const value = React.useMemo(() => ({ party, setParty }), [party, setParty]);

  return (
    <QueryClientProvider client={queryClient}>
      <PartyContext.Provider value={value}>{children}</PartyContext.Provider>
    </QueryClientProvider>
  );
}

export { PARTIES };
export type { PartyName };
