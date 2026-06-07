import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/auth/PermissionGate';
import { ActiveVisitScreen } from '@/features/visit/ActiveVisitScreen';

export default function UnplannedVisit() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  return (
    <PermissionGate screen="visit_active" title="Visit">
      <ActiveVisitScreen mode="unplanned" doctorId={doctorId} />
    </PermissionGate>
  );
}
