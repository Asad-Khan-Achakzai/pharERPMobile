import * as React from 'react';
import { PermissionGate } from '@/auth/PermissionGate';
import { KpiScreenImpl } from '@/features/kpi/KpiScreen';

export default function KpiScreen() {
  return (
    <PermissionGate screen="kpi" title="Targets & KPI">
      <KpiScreenImpl />
    </PermissionGate>
  );
}
