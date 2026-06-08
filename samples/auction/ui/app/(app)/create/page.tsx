/**
 * List an item — create a new Auction contract with the current party as
 * seller/signatory. Invited bidders become the contract's observers.
 * Submits a CreateCommand through the ledger (Canton or mock).
 */

'use client';

import { ArrowLeft, Check, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { PARTIES, useParty } from '@/components/providers';
import { useCreateAuction } from '@/lib/client/hooks';
import type { PartyName } from '@/lib/parties';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  buttonVariants,
  cn,
} from '@/lib/ui';

const DURATIONS = [
  { label: '2 min', minutes: 2 },
  { label: '10 min', minutes: 10 },
  { label: '1 hour', minutes: 60 },
  { label: '24 hours', minutes: 1440 },
] as const;

export default function CreatePage() {
  const router = useRouter();
  const { party } = useParty();
  const create = useCreateAuction();

  const [item, setItem] = React.useState('');
  const [reserve, setReserve] = React.useState('');
  const [minutes, setMinutes] = React.useState<number>(60);
  const [bidders, setBidders] = React.useState<PartyName[]>([]);

  // Eligible bidders = everyone except the acting seller.
  const candidates = PARTIES.filter((p) => p !== party);

  // Default-select all candidates whenever the acting party changes.
  React.useEffect(() => {
    setBidders(PARTIES.filter((p) => p !== party));
  }, [party]);

  const reserveValid = /^\d+(\.\d{1,2})?$/.test(reserve);
  const valid = item.trim().length > 0 && reserveValid && bidders.length > 0;

  function toggle(p: PartyName) {
    setBidders((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function submit() {
    if (!valid) return;
    const closesAt = new Date(Date.now() + minutes * 60_000).toISOString();
    try {
      const created = await create.mutateAsync({
        itemDescription: item.trim(),
        reservePrice: Number.parseFloat(reserve).toFixed(2),
        closesAt,
        bidders,
      });
      toast.success('Lot listed on Canton');
      router.push(`/auctions/${created.contractId}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft className="size-4" /> All lots
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">List an item</h1>
        <p className="mt-1 text-foreground-muted">
          You'll be the seller and signatory. Invited bidders become observers on the contract.
        </p>
      </div>

      <Card variant="raised">
        <CardHeader>
          <CardTitle>Lot details</CardTitle>
          <CardDescription>Seller: {party}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Item description">
            <Input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. Vintage Daml Compiler T-shirt"
              maxLength={200}
            />
          </Field>

          <Field label="Reserve price" hint="Numeric with up to 2 decimals (CC)">
            <Input
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
              placeholder="50.00"
              inputMode="decimal"
              invalid={reserve.length > 0 && !reserveValid}
              suffix={<span className="text-sm">CC</span>}
            />
          </Field>

          <Field label="Closes in">
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  type="button"
                  onClick={() => setMinutes(d.minutes)}
                  className={cn(
                    'flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                    minutes === d.minutes
                      ? 'border-brand bg-brand-soft text-foreground'
                      : 'border-border-default bg-surface-1 text-foreground-muted hover:bg-surface-2',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Invite bidders">
            <div className="flex flex-wrap gap-2">
              {candidates.map((p) => {
                const on = bidders.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggle(p)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-sm font-medium transition-colors cursor-pointer',
                      on
                        ? 'border-brand bg-brand-soft text-foreground'
                        : 'border-border-default bg-surface-1 text-foreground-muted hover:bg-surface-2',
                    )}
                  >
                    {on && <Check className="size-3.5 text-brand" />}
                    {p}
                  </button>
                );
              })}
            </div>
          </Field>

          <Button
            width="full"
            size="lg"
            onClick={submit}
            disabled={!valid}
            pending={create.isPending}
            leftIcon={<Plus className="size-4" />}
          >
            List lot on Canton
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && <span className="text-xs text-foreground-subtle">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
