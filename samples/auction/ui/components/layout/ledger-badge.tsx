/**
 * LedgerBadge — shows whether the app is talking to a live Canton
 * participant or the built-in mock ledger. Reads the `live` flag the
 * list endpoint returns, so it reflects the server's actual wiring.
 */

'use client';

import { Database, Radio } from 'lucide-react';

import { useAuctions } from '@/lib/client/hooks';
import { Badge } from '@/lib/ui';

export function LedgerBadge() {
  const { data } = useAuctions();
  const live = data?.live ?? false;
  return live ? (
    <Badge variant="success" size="md">
      <Radio className="size-3" /> Live Canton JSON API
    </Badge>
  ) : (
    <Badge variant="warning" size="md">
      <Database className="size-3" /> Mock ledger
    </Badge>
  );
}
