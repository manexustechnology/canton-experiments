/**
 * React Query hooks bound to the current acting party. Mutations
 * invalidate the auctions list so the gallery and detail views refresh
 * the moment a bid / settle / extend lands. The list polls every few
 * seconds so a bid from another identity shows up without a manual
 * refresh — handy when you open two tabs as two parties.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useParty } from '@/components/providers';
import * as api from './api';

export function useAuctions() {
  const { party } = useParty();
  return useQuery({
    queryKey: ['auctions', party],
    queryFn: () => api.listAuctions(party),
    refetchInterval: 5_000,
  });
}

/** Pick a single auction out of the (party-scoped) list. */
export function useAuction(contractId: string) {
  const query = useAuctions();
  const auction = query.data?.auctions.find((a) => a.contractId === contractId);
  return { ...query, auction };
}

export function useCreateAuction() {
  const { party } = useParty();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.CreateAuctionInput) => api.createAuction(party, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
  });
}

export function usePlaceBid() {
  const { party } = useParty();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { contractId: string; price: string }) =>
      api.placeBid(party, vars.contractId, vars.price),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
  });
}

export function useSettle() {
  const { party } = useParty();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => api.settleAuction(party, contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
  });
}

export function useExtend() {
  const { party } = useParty();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { contractId: string; minutes: number }) =>
      api.extendAuction(party, vars.contractId, vars.minutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
  });
}
