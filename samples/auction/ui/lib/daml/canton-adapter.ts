/**
 * Live Canton ledger client — a TypeScript port of Tenzro's CantonAdapter
 * (tenzro-network/crates/tenzro-bridge/src/canton.rs).
 *
 * It speaks the exact same Canton JSON Ledger API v2 wire format Tenzro
 * uses from its validators:
 *
 *   - POST /v2/commands/submit-and-wait-for-transaction
 *       envelope: { commands: [{ commandType, templateId, ... }],
 *                   commandId, userId, actAs, readAs, workflowId? }
 *       (the `*-transaction-tree` endpoint was removed in Canton 3.5)
 *   - POST /v2/state/active-contracts
 *       filtersByParty → cumulative → identifierFilter.TemplateFilter
 *   - POST /v2/events/events-by-contract-id   { contractId, requestingParties }
 *
 * Response parsing mirrors CantonAdapter's `into_created_response` /
 * `into_exercise_response`: try the Canton 3.5+ flat `transaction.events`
 * first, then fall back to the 3.3/3.4 `transactionTree.eventsById` tree.
 *
 * Keeping the shapes identical to the Rust adapter means a DAR deployed
 * and driven by Tenzro (`tenzro contract deploy --vm daml`,
 * `tenzro canton submit …`) is the same ledger this UI reads and writes.
 */

import {
  CANTON_APP_ID,
  CANTON_PACKAGE,
  jsonApiBaseUrl,
  partyId,
  tokenForParty,
} from './config';
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

/**
 * Package-qualified template id. The leading `#` resolves by package
 * *name* (the DAR's `name:` is `auction`) rather than a pinned hash —
 * the same convenience Canton 3.4 offers. Override with CANTON_PACKAGE.
 */
const TEMPLATE_ID = `#${CANTON_PACKAGE}:Auction:Auction`;

let commandSeq = 0;
function commandId(): string {
  commandSeq += 1;
  // CantonAdapter uses `${application_id}-${uuid}`; (application_id,
  // commandId, actAs) is Canton's dedup key.
  return `${CANTON_APP_ID}-${Date.now()}-${commandSeq}`;
}

// Canton JSON Ledger API v2 commands are externally tagged — verified
// against a live participant: a flat `{ commandType: "create" }` form is
// rejected with "JSON decoding to CNil". The envelope is also nested one
// level under `commands` (see `envelope` below).
type CommandV2 =
  | { CreateCommand: { templateId: string; createArguments: unknown } }
  | {
      ExerciseCommand: {
        templateId: string;
        contractId: string;
        choice: string;
        choiceArgument: unknown;
      };
    };

export class CantonLedger implements Ledger {
  private async post<T>(endpoint: string, party: string, body: unknown): Promise<T> {
    const token = tokenForParty(party);
    const res = await fetch(`${jsonApiBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      // Surface Canton's message; a failed choice carries the DAML
      // assertMsg text (e.g. "Auction has closed").
      throw new LedgerError(extractError(text) ?? `Canton JSON API ${res.status}`, res.status);
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  /**
   * Build the request body. The JSON Ledger API v2 nests the JsCommands
   * object under a top-level `commands` key (verified against a live
   * participant — a flat envelope is rejected with "Missing required
   * field at 'commands.commands'").
   */
  private envelope(party: string, commands: CommandV2[]) {
    return {
      commands: {
        commands,
        commandId: commandId(),
        userId: CANTON_APP_ID,
        actAs: [partyId(party)],
        readAs: [] as string[],
      },
    };
  }

  /** GET the participant's current ledger end (an integer offset). */
  private async ledgerEnd(party: string): Promise<number> {
    const token = tokenForParty(party);
    const res = await fetch(`${jsonApiBaseUrl()}/state/ledger-end`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) throw new LedgerError(`ledger-end ${res.status}`, res.status);
    const j = (await res.json()) as { offset?: number };
    return j.offset ?? 0;
  }

  async listAuctions(actingParty: string): Promise<AuctionContract[]> {
    const party = partyId(actingParty);
    // Verified against a live participant: the TemplateFilter value
    // requires `includeCreatedEventBlob`, and `activeAtOffset` must be an
    // integer offset (null is rejected) — so we read it from ledger-end.
    const activeAtOffset = await this.ledgerEnd(actingParty);
    const body = {
      filter: {
        filtersByParty: {
          [party]: {
            cumulative: [
              {
                identifierFilter: {
                  TemplateFilter: {
                    value: { templateId: TEMPLATE_ID, includeCreatedEventBlob: false },
                  },
                },
              },
            ],
          },
        },
      },
      verbose: true,
      activeAtOffset,
    };
    const rows = await this.post<unknown>('/state/active-contracts', actingParty, body);
    return parseActiveContracts(rows);
  }

  async createAuction(actingParty: string, args: CreateAuctionArgs): Promise<AuctionContract> {
    const createArguments: AuctionPayload = {
      seller: partyId(actingParty),
      bidders: args.bidders.map(partyId),
      itemDescription: args.itemDescription,
      reservePrice: args.reservePrice,
      closesAt: args.closesAt,
      highBid: null,
    };
    const res = await this.post<SubmitResponse>(
      '/commands/submit-and-wait-for-transaction',
      actingParty,
      this.envelope(actingParty, [
        { CreateCommand: { templateId: TEMPLATE_ID, createArguments } },
      ]),
    );
    return firstCreatedAuction(res);
  }

  async placeBid(
    actingParty: string,
    contractId: string,
    args: PlaceBidArgs,
  ): Promise<AuctionContract> {
    const res = await this.post<SubmitResponse>(
      '/commands/submit-and-wait-for-transaction',
      actingParty,
      this.envelope(actingParty, [
        {
          ExerciseCommand: {
            templateId: TEMPLATE_ID,
            contractId,
            choice: 'PlaceBid',
            choiceArgument: { bidder: partyId(actingParty), price: args.price },
          },
        },
      ]),
    );
    return firstCreatedAuction(res);
  }

  async settle(actingParty: string, contractId: string): Promise<BidInfo | null> {
    const res = await this.post<SubmitResponse>(
      '/commands/submit-and-wait-for-transaction',
      actingParty,
      this.envelope(actingParty, [
        {
          ExerciseCommand: {
            templateId: TEMPLATE_ID,
            contractId,
            choice: 'Settle',
            choiceArgument: {},
          },
        },
      ]),
    );
    const result = firstExerciseResult(res);
    return (result as BidInfo | null) ?? null;
  }

  async extend(
    actingParty: string,
    contractId: string,
    args: ExtendArgs,
  ): Promise<AuctionContract> {
    // Auction.Extend takes a RelTime; v2 encodes it as microseconds.
    const microseconds = String(args.minutes * 60_000_000);
    const res = await this.post<SubmitResponse>(
      '/commands/submit-and-wait-for-transaction',
      actingParty,
      this.envelope(actingParty, [
        {
          ExerciseCommand: {
            templateId: TEMPLATE_ID,
            contractId,
            choice: 'Extend',
            choiceArgument: { by: { microseconds } },
          },
        },
      ]),
    );
    return firstCreatedAuction(res);
  }
}

// ---- response parsing (mirrors CantonAdapter's into_* helpers) ----

interface SubmitResponse {
  transaction?: { events?: unknown[] };
  transactionTree?: { eventsById?: Record<string, unknown> };
  eventsById?: Record<string, unknown>;
}

function eventList(res: SubmitResponse): unknown[] {
  if (res.transaction?.events?.length) return res.transaction.events;
  const tree = res.transactionTree?.eventsById ?? res.eventsById;
  return tree ? Object.values(tree) : [];
}

function get(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}

/** Pull a CreatedEvent's {contractId, createArguments} out of any v2 shape. */
function extractCreated(value: unknown): AuctionContract | null {
  const created =
    get(value, 'CreatedEvent') ??
    get(value, 'CreatedTreeEvent') ??
    get(value, 'Created') ??
    get(value, 'created') ??
    (get(value, 'contractId') !== undefined ? value : undefined);
  if (!created) return null;
  const contractId = get(created, 'contractId');
  if (typeof contractId !== 'string') return null;
  const payload =
    get(created, 'createArguments') ?? get(created, 'arguments') ?? get(created, 'payload') ?? null;
  return { contractId, payload: payload as AuctionPayload };
}

function extractExerciseResult(value: unknown): unknown {
  const exercised =
    get(value, 'ExercisedEvent') ??
    get(value, 'ExercisedTreeEvent') ??
    get(value, 'Exercised') ??
    get(value, 'exercised') ??
    (get(value, 'exerciseResult') !== undefined ? value : undefined);
  return exercised ? get(exercised, 'exerciseResult') : undefined;
}

function firstCreatedAuction(res: SubmitResponse): AuctionContract {
  for (const ev of eventList(res)) {
    const c = extractCreated(ev);
    if (c) return c;
  }
  throw new LedgerError('Canton submit returned no CreatedEvent', 502);
}

function firstExerciseResult(res: SubmitResponse): unknown {
  for (const ev of eventList(res)) {
    const r = extractExerciseResult(ev);
    if (r !== undefined) return r;
  }
  return null;
}

/**
 * Parse /v2/state/active-contracts. Mirrors CantonAdapter's
 * `JsonApiQueryResponse::into_contracts`: the response is either
 * `{ contractEntries: [...] }` (modern) or `{ results: [...] }` (legacy
 * streaming), and each entry wraps a `JsActiveContract.createdEvent`.
 * Some participants also return a bare array of rows — we accept that
 * too. All lookups have permissive fallbacks.
 */
function parseActiveContracts(rows: unknown): AuctionContract[] {
  const entries: unknown[] = Array.isArray(rows)
    ? rows
    : ((get(rows, 'contractEntries') as unknown[] | undefined) ??
      (get(rows, 'results') as unknown[] | undefined) ??
      (rows ? [rows] : []));

  const out: AuctionContract[] = [];
  for (const entry of entries) {
    const active = get(entry, 'JsActiveContract') ?? get(entry, 'activeContract') ?? entry;
    const created =
      get(active, 'createdEvent') ?? get(active, 'CreatedEvent') ?? get(active, 'created');
    if (!created) continue;
    const contractId = get(created, 'contractId');
    if (typeof contractId !== 'string') continue;
    const payload =
      get(created, 'createArguments') ?? get(created, 'arguments') ?? get(created, 'payload') ?? null;
    out.push({ contractId, payload: payload as AuctionPayload });
  }
  return out;
}

function extractError(text: string): string | undefined {
  try {
    const j = JSON.parse(text) as { cause?: string; error?: string; errors?: string[] };
    return j.cause ?? j.error ?? j.errors?.join('; ');
  } catch {
    return text.slice(0, 300) || undefined;
  }
}
