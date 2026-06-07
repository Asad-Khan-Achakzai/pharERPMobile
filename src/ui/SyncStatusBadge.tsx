import * as React from 'react';
import { Badge } from '@/ui/Badge';
import type { SyncUiState } from '@/data/localEntities';

const LABELS: Record<SyncUiState, string> = {
  pending: 'Pending sync',
  syncing: 'Syncing',
  synced: 'Synced',
  failed: 'Failed',
};

const TONES: Record<SyncUiState, 'warning' | 'default' | 'success' | 'danger' | 'muted'> = {
  pending: 'warning',
  syncing: 'default',
  synced: 'success',
  failed: 'danger',
};

export function SyncStatusBadge({
  state,
  className,
}: {
  state?: SyncUiState | null;
  className?: string;
}) {
  if (!state || state === 'synced') return null;
  return (
    <Badge tone={TONES[state]} className={className}>
      {LABELS[state]}
    </Badge>
  );
}
