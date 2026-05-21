import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActiveVisitScreen } from '@/features/visit/ActiveVisitScreen';

export default function UnplannedVisit() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  return <ActiveVisitScreen mode="unplanned" doctorId={doctorId} />;
}
