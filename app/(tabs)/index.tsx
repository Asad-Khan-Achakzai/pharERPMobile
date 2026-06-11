import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/ui/Screen';
import { HomeHero } from '@/features/home/HomeHero';
import { CheckInCard } from '@/features/attendance/CheckInCard';
import { OutboxFooter } from '@/features/sync/OutboxFooter';
import { CompanyGate } from '@/features/onboarding/CompanyGate';
import { HomeTodayExecution } from '@/features/home/HomeTodayExecution';
import { HomeNotifications } from '@/features/home/HomeNotifications';
import { HomeManagerSection } from '@/features/home/HomeManagerSection';
import { usePermissions } from '@/hooks/usePermissions';

export default function HomeScreen() {
  const qc = useQueryClient();
  const { canAny } = usePermissions();

  const showCheckIn = canAny(['attendance.view', 'attendance.mark']);

  const onRefresh = React.useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['plan-items', 'today'] });
    await qc.invalidateQueries({ queryKey: ['orders', 'today'] });
    await qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
    await qc.invalidateQueries({ queryKey: ['attendance', 'team-today'] });
    await qc.invalidateQueries({ queryKey: ['notifications', 'feed'] });
    await qc.invalidateQueries({ queryKey: ['dashboard', 'team-summary'] });
    await qc.invalidateQueries({ queryKey: ['weekly-plans', 'pending-approvals'] });
    await qc.invalidateQueries({ queryKey: ['attendance', 'requests'] });
    await qc.invalidateQueries({ queryKey: ['expenses', 'inbox'] });
  }, [qc]);

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <CompanyGate>
      <Screen padded={false} refreshing={refreshing} onRefresh={handleRefresh}>
        <HomeHero />
        <OutboxFooter />
        {showCheckIn ? <CheckInCard /> : null}
        <HomeTodayExecution />
        <HomeNotifications />
        <HomeManagerSection />
      </Screen>
    </CompanyGate>
  );
}
