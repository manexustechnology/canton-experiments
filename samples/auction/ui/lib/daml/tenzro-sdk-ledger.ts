/**
 * Ledger client for the hosted Tenzro node, via the `tenzro-sdk` package.
 *
 *   client.canton.listContracts(...)  → tenzro_listDamlContracts
 *   client.canton.submitCommand(...)  → tenzro_submitDamlCommand
 *   client.canton.getMyUser()         → tenzro_canton_getMyUser
 *
 * The node proxies these to the participant the auction DAR was uploaded
 * to. Template ids use the package-name ref `#auction:Auction:Auction`.
 *
 * Auth: the SDK reads TENZRO_API_KEY from the environment and sends it as
 * X-Tenzro-Api-Key (scope `canton`). Server-side only.
 *
 * Live-node realities this adapter works around (see CANTON_OPERATOR_BUGS.txt,
 * verified 2026-06-15 against rpc.tenzro.network / Canton 3.5.1):
 *
 *  1. Submit needs an explicit `act_as`. The node rejects a submit with an
 *     empty actAs (the key has no `canton_user_id` binding and the default
 *     act_as_party is unset). The SDK's typed `DamlCommandParams` omits
 *     `act_as`, but `submitCommand` forwards the params object verbatim to
 *     the RPC — so we add `act_as` (resolved party) on every call.
 *  2. Reads are broken: the deployed node still builds the pre-3.5
 *     active-contracts request shape, so `listContracts` returns -32000.
 *     We keep a write-derived cache of the contract state every submit
 *     response returns and serve `listAuctions` from it whenever the node
 *     read fails. Once the operator ships the read fix, the live read takes
 *     over automatically (it's authoritative when it succeeds).
 *
 * The cache is per server process and only holds auctions this app has
 * created/modified — it is a usability bridge, not a source of truth.
 */

import { TenzroClient, MAINNET_CONFIG } from 'tenzro-sdk';
import type { DamlCommandParams, DamlCommandResult } from 'tenzro-sdk';

import { CANTON_PACKAGE, TENZRO_RPC_ENDPOINT, partyId } from './config';
import { LedgerError } from './ledger';
import type { Ledger } from './ledger';
import type {
  AuctionContract,
  AuctionPayload,
  BidInfo,
  CreateAuctionArgs,
  ExtendArgs,
  PlaceBidArgs,
} from './types';

const TEMPLATE_ID = `#${CANTON_PACKAGE}:Auction:Auction`;

/**
 * Write-derived view of active auctions, keyed by contractId. Updated from
 * every submit response (create adds; exercise archives the old id and adds
 * the new one). Backs `listAuctions` while the node read path is down.
 */
const writeCache = new Map<string, AuctionContract>();

/** `act_as` carried alongside the SDK's typed params (forwarded verbatim). */
type SubmitParams = DamlCommandParams & { act_as: string };

export class TenzroSdkLedger implements Ledger {
  private readonly client: TenzroClient;
  private cachedNodeParty: string | null = null;

  constructor() {
    this.client = new TenzroClient({
      ...MAINNET_CONFIG,
      endpoint: TENZRO_RPC_ENDPOINT,
    });
  }

  private async nodeParty(): Promise<string> {
    if (this.cachedNodeParty) return this.cachedNodeParty;
    const { user } = await this.call(() => this.client.canton.getMyUser());
    this.cachedNodeParty = user.primaryParty;
    return this.cachedNodeParty;
  }

  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new LedgerError(message || 'Tenzro RPC call failed', 502);
    }
  }

  /** Submit a command, always supplying `act_as` (see header note 1). */
  private submit(actAs: string, params: DamlCommandParams): Promise<DamlCommandResult> {
    return this.call(() =>
      this.client.canton.submitCommand({ ...params, act_as: actAs } as SubmitParams),
    );
  }

  async listAuctions(_actingParty: string): Promise<AuctionContract[]> {
    // Prefer the authoritative live read; fall back to the write cache when
    // the node read path is down (see header note 2).
    try {
      const res = await this.client.canton.listContracts({ template_ids: [TEMPLATE_ID] });
      const live = res.contracts.map((c) => ({
        contractId: c.contract_id,
        payload: c.payload as unknown as AuctionPayload,
      }));
      // Live read succeeded → it's the truth; reset the cache to match.
      writeCache.clear();
      for (const a of live) writeCache.set(a.contractId, a);
      return live;
    } catch {
      return Array.from(writeCache.values());
    }
  }

  async createAuction(actingParty: string, args: CreateAuctionArgs): Promise<AuctionContract> {
    const seller = partyId(actingParty, await this.nodeParty());
    const payload: AuctionPayload = {
      seller,
      bidders: args.bidders.map((b) => partyId(b)),
      itemDescription: args.itemDescription,
      reservePrice: args.reservePrice,
      closesAt: args.closesAt,
      highBid: null,
    };
    const res = await this.submit(seller, {
      command_type: 'create',
      template_id: TEMPLATE_ID,
      create_arguments: payload as unknown as Record<string, unknown>,
    });
    if (typeof res.contract_id !== 'string') {
      throw new LedgerError('Tenzro create returned no contract_id', 502);
    }
    // The create response payload is null; the arguments we sent ARE the
    // contract's payload, so cache those.
    const contract: AuctionContract = { contractId: res.contract_id, payload };
    writeCache.set(contract.contractId, contract);
    return contract;
  }

  async placeBid(
    actingParty: string,
    contractId: string,
    args: PlaceBidArgs,
  ): Promise<AuctionContract> {
    const bidder = partyId(actingParty, await this.nodeParty());
    const res = await this.submit(bidder, {
      command_type: 'exercise',
      template_id: TEMPLATE_ID,
      contract_id: contractId,
      choice: 'PlaceBid',
      choice_argument: { bidder, price: args.price },
    });
    return this.applyExercise(res, contractId);
  }

  async settle(actingParty: string, contractId: string): Promise<BidInfo | null> {
    const seller = partyId(actingParty, await this.nodeParty());
    const res = await this.submit(seller, {
      command_type: 'exercise',
      template_id: TEMPLATE_ID,
      contract_id: contractId,
      choice: 'Settle',
      choice_argument: {},
    });
    // Settle consumes the auction and returns Optional BidInfo.
    this.reconcileArchived(res, contractId);
    return (res.exercise_result as BidInfo | null) ?? null;
  }

  async extend(
    actingParty: string,
    contractId: string,
    args: ExtendArgs,
  ): Promise<AuctionContract> {
    const seller = partyId(actingParty, await this.nodeParty());
    // Extend takes a RelTime; v2 encodes it as microseconds.
    const microseconds = String(args.minutes * 60_000_000);
    const res = await this.submit(seller, {
      command_type: 'exercise',
      template_id: TEMPLATE_ID,
      contract_id: contractId,
      choice: 'Extend',
      choice_argument: { by: { microseconds } },
    });
    return this.applyExercise(res, contractId);
  }

  /**
   * PlaceBid and Extend archive the input contract and create a new Auction.
   * The submit response carries the resulting CreatedEvent (with full
   * createArgument) inline — parse it directly rather than re-reading, since
   * the live read is down. Update the cache to match.
   */
  private applyExercise(res: DamlCommandResult, inputContractId: string): AuctionContract {
    this.reconcileArchived(res, inputContractId);
    const created = createdFromEvents(res.events);
    if (!created) {
      throw new LedgerError('Exercise returned no resulting Auction contract', 502);
    }
    writeCache.set(created.contractId, created);
    return created;
  }

  /** Drop archived contracts (the input, plus any ArchivedEvent) from cache. */
  private reconcileArchived(res: DamlCommandResult, inputContractId: string): void {
    writeCache.delete(inputContractId);
    for (const cid of archivedCids(res.events)) writeCache.delete(cid);
  }
}

// ---- submit-response event parsing (Canton v2 shapes) ----

function getField(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}

/** Pull the first CreatedEvent {contractId, createArgument} from an events list. */
function createdFromEvents(events: unknown): AuctionContract | null {
  if (!Array.isArray(events)) return null;
  for (const ev of events) {
    const created =
      getField(ev, 'CreatedEvent') ?? getField(ev, 'Created') ?? getField(ev, 'created');
    if (!created) continue;
    const contractId = getField(created, 'contractId');
    if (typeof contractId !== 'string') continue;
    const payload =
      getField(created, 'createArgument') ??
      getField(created, 'createArguments') ??
      getField(created, 'payload') ??
      null;
    return { contractId, payload: payload as AuctionPayload };
  }
  return null;
}

/** Contract ids archived by the command (consumed inputs). */
function archivedCids(events: unknown): string[] {
  if (!Array.isArray(events)) return [];
  const out: string[] = [];
  for (const ev of events) {
    const archived =
      getField(ev, 'ArchivedEvent') ?? getField(ev, 'Archived') ?? getField(ev, 'archived');
    const contractId = getField(archived, 'contractId');
    if (typeof contractId === 'string') out.push(contractId);
  }
  return out;
}
