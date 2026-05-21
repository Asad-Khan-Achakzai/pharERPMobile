import * as React from 'react';
import { View } from 'react-native';
import { Activity, ShoppingBag, Wallet } from 'lucide-react-native';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { ProgressBar } from '@/ui/ProgressBar';
import type { RepDashboard } from '@/api/dashboard';

interface KPITileProps {
  label: string;
  value: string;
  helper?: string;
  achieved?: number;
  target?: number;
  icon: React.ReactNode;
  tone?: 'primary' | 'success' | 'warning';
}

const KPITile: React.FC<KPITileProps> = ({
  label,
  value,
  helper,
  achieved = 0,
  target = 0,
  icon,
  tone = 'primary',
}) => {
  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  return (
    <Card className="flex-1 mx-1" padded>
      <View className="flex-row items-center justify-between mb-2">
        {icon}
        <Text size="xs" tone="muted" weight="medium">
          {pct}%
        </Text>
      </View>
      <Text size="lg" weight="bold" numberOfLines={1}>
        {value}
      </Text>
      <Text size="xs" tone="muted">
        {label}
      </Text>
      {target > 0 ? <ProgressBar value={achieved} max={target} tone={tone} className="mt-2" /> : null}
      {helper ? (
        <Text size="xs" tone="muted" className="mt-1">
          {helper}
        </Text>
      ) : null}
    </Card>
  );
};

export const KPIGrid: React.FC<{ data?: RepDashboard }> = ({ data }) => {
  const kpi = data?.kpi ?? {};
  return (
    <View className="px-3">
      <View className="flex-row">
        <KPITile
          label="Visits today"
          value={String(kpi.visitsCompleted ?? 0)}
          achieved={kpi.visitsCompleted ?? 0}
          target={kpi.visitsTarget ?? 0}
          icon={<Activity size={18} color="#2563eb" />}
        />
        <KPITile
          label="Orders MTD"
          value={`Rs ${Math.round(kpi.ordersAmount ?? 0).toLocaleString()}`}
          achieved={kpi.ordersAmount ?? 0}
          target={kpi.ordersTarget ?? 0}
          tone="success"
          icon={<ShoppingBag size={18} color="#10b981" />}
        />
      </View>
      <View className="flex-row mt-2">
        <KPITile
          label="Collections MTD"
          value={`Rs ${Math.round(kpi.collectionsAmount ?? 0).toLocaleString()}`}
          achieved={kpi.collectionsAmount ?? 0}
          target={kpi.collectionsTarget ?? 0}
          tone="warning"
          icon={<Wallet size={18} color="#f59e0b" />}
        />
        <KPITile
          label="Planned visits"
          value={`${data?.today?.completedCount ?? 0}/${data?.today?.plannedCount ?? 0}`}
          helper={`${data?.today?.missedCount ?? 0} missed`}
          icon={<Activity size={18} color="#2563eb" />}
        />
      </View>
    </View>
  );
};
