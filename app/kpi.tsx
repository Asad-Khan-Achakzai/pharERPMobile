import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle } from '@/ui/Text';
import { ProgressBar } from '@/ui/ProgressBar';
import { SkeletonRow } from '@/ui/Skeleton';
import { Divider } from '@/ui/ListRow';
import { EmptyState } from '@/ui/EmptyState';
import { targetsApi } from '@/api/targets';
import { PermissionGate } from '@/auth/PermissionGate';

function KpiScreenImpl() {
  const q = useQuery({ queryKey: ['targets', 'me'], queryFn: () => targetsApi.myCurrent() });
  const totals = q.data?.totals;

  return (
    <Screen padded={false}>
      <Header back title="Targets & KPI" />
      {q.isLoading ? (
        <View className="px-4">
          <SkeletonRow count={3} />
        </View>
      ) : !q.data?.productTargets || q.data.productTargets.length === 0 ? (
        <EmptyState
          title="No targets set"
          description="Your manager has not assigned a monthly target yet."
        />
      ) : (
        <>
          <Card className="mx-4 mt-2">
            <Subtitle>Month-to-date value</Subtitle>
            <H2>Rs {Math.round(totals?.valueAchieved ?? 0).toLocaleString()}</H2>
            <ProgressBar
              value={totals?.valueAchieved ?? 0}
              max={totals?.valueTarget ?? 1}
              className="mt-2"
            />
            <Text size="xs" tone="muted" className="mt-1">
              Target Rs {Math.round(totals?.valueTarget ?? 0).toLocaleString()}
            </Text>
          </Card>

          <Card className="mx-4 mt-2" padded={false}>
            <View className="px-3 py-2">
              <Subtitle>Product breakdown</Subtitle>
            </View>
            <Divider />
            {q.data.productTargets.map((p, i, arr) => (
              <View key={p.productId}>
                <View className="px-3 py-3">
                  <View className="flex-row justify-between mb-1">
                    <Text size="sm" weight="medium" numberOfLines={1}>
                      {p.productName ?? p.productId}
                    </Text>
                    <Text size="sm">
                      {p.qtyAchieved ?? 0} / {p.qtyTarget ?? 0}
                    </Text>
                  </View>
                  <ProgressBar value={p.qtyAchieved ?? 0} max={p.qtyTarget ?? 1} />
                </View>
                {i < arr.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

export default function KpiScreen() {
  return (
    <PermissionGate screen="kpi" title="Targets & KPI">
      <KpiScreenImpl />
    </PermissionGate>
  );
}
