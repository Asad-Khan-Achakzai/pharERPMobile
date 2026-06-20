import * as React from 'react';
import { View, Pressable, ScrollView, RefreshControl, BackHandler } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  CalendarDays,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle } from '@/ui/Text';
import { ProgressBar } from '@/ui/ProgressBar';
import { Badge } from '@/ui/Badge';
import { Divider } from '@/ui/ListRow';
import { EmptyState } from '@/ui/EmptyState';
import { KpiPageSkeleton } from '@/ui/listCardSkeletons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/state/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { reportsApi, type MrepOverviewRep } from '@/api/reports';
import { targetsApi } from '@/api/targets';
import { attendanceApi } from '@/api/attendance';
import { KpiFilterSheet, type KpiFilters } from './KpiFilterSheet';
import {
  achievementTone,
  countDoctorsMetCoverage,
  currentMonthYmd,
  fmtPct,
  fmtPkr,
  formatMonthLabel,
  shiftMonth,
  teamAggregate,
  workingDaysLabel,
} from './kpiUtils';

function MetricLine({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center py-1.5">
      <Text size="sm" tone="muted">
        {label}
      </Text>
      <Text size="sm" weight={emphasize ? 'bold' : 'semibold'}>
        {value}
      </Text>
    </View>
  );
}

function AchievementCard({ rep }: { rep: MrepOverviewRep }) {
  const { colors } = useTheme();
  const target = rep.target?.salesTarget ?? 0;
  const achieved = rep.target?.achievedSales ?? rep.totalGrossSalesTp ?? 0;
  const remaining = Math.max(0, target - achieved);
  const pct =
    rep.target?.salesAchievementPercent ??
    (target > 0 ? Math.round((achieved / target) * 100) : 0);
  const doctorsTotal = rep.coverage?.doctorsTracked ?? 0;
  const doctorsMet = countDoctorsMetCoverage(rep.coverage?.doctors);
  const covPct = rep.coverage?.coveragePercent;

  return (
    <Card className="mx-4 mt-2 overflow-hidden" padded={false}>
      <View className="px-4 pt-4 pb-3" style={{ backgroundColor: colors.primaryMuted }}>
        <View className="flex-row items-center mb-1">
          <Target size={18} color={colors.primary} />
          <Subtitle className="ml-2">Target achievement</Subtitle>
        </View>
        <View className="flex-row items-end justify-between mt-2">
          <View className="flex-1">
            <Text size="xs" tone="muted">
              Achievement
            </Text>
            <H2 style={{ color: colors.primary }}>{fmtPct(pct)}</H2>
          </View>
          <Badge tone={achievementTone(pct)}>{pct >= 100 ? 'On track' : pct >= 50 ? 'In progress' : 'Needs focus'}</Badge>
        </View>
        <ProgressBar value={achieved} max={target || 1} tone={achievementTone(pct)} className="mt-3" />
      </View>
      <View className="px-4 py-3">
        <MetricLine label="Sales target" value={fmtPkr(target)} />
        <MetricLine label="Achieved" value={fmtPkr(achieved)} emphasize />
        <MetricLine label="Remaining" value={fmtPkr(remaining)} />
        <Divider className="my-2" />
        <MetricLine
          label="Doctors coverage"
          value={
            doctorsTotal
              ? `${doctorsMet} / ${doctorsTotal} (${fmtPct(covPct)})`
              : fmtPct(covPct)
          }
        />
      </View>
    </Card>
  );
}

function GrossSalesCard({ rep }: { rep: MrepOverviewRep }) {
  const gross = rep.totalGrossSalesTp ?? rep.ordersInPeriod?.grossRevenue ?? 0;
  const orders = rep.ordersInPeriod?.orderCount ?? 0;
  return (
    <Card className="mx-4 mt-2">
      <View className="flex-row items-center mb-2">
        <TrendingUp size={18} color="#10b981" />
        <Subtitle className="ml-2">Monthly gross sales</Subtitle>
      </View>
      <H2>{fmtPkr(gross)}</H2>
      <Text size="xs" tone="muted" className="mt-1">
        Net TP from deliveries · {orders} order{orders === 1 ? '' : 's'} in period
      </Text>
    </Card>
  );
}

function ProductPerformanceCard({
  repId,
  month,
}: {
  repId: string;
  month: string;
}) {
  const q = useQuery({
    queryKey: ['targets', 'packs-breakdown', repId, month],
    queryFn: () => targetsApi.packsBreakdown(repId, month),
  });
  const rows = (q.data?.rows ?? []).filter((r) => (r.packsTarget ?? 0) > 0 || (r.netQuantity ?? 0) > 0);

  return (
    <Card className="mx-4 mt-2 mb-4" padded={false}>
      <View className="px-4 py-3">
        <Subtitle>Product-wise performance</Subtitle>
        <Text size="xs" tone="muted" className="mt-0.5">
          Pack targets vs net delivered packs
        </Text>
      </View>
      <Divider />
      {q.isLoading ? (
        <View className="px-4 py-6">
          <Text tone="muted" size="sm">
            Loading products…
          </Text>
        </View>
      ) : rows.length === 0 ? (
        <View className="px-4 py-6">
          <Text tone="muted" size="sm">
            No product targets or sales recorded this month.
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row px-4 py-2 bg-muted/40">
            <Text size="xs" tone="muted" className="flex-[2]">
              Product
            </Text>
            <Text size="xs" tone="muted" className="flex-1 text-right">
              Target
            </Text>
            <Text size="xs" tone="muted" className="flex-1 text-right">
              Sales
            </Text>
            <Text size="xs" tone="muted" className="w-10 text-right">
              %
            </Text>
          </View>
          {rows.map((row, i) => {
            const target = row.packsTarget ?? 0;
            const sales = row.netQuantity ?? 0;
            const pct =
              row.progressPercent != null
                ? Math.round(row.progressPercent)
                : target > 0
                  ? Math.round((sales / target) * 100)
                  : null;
            return (
              <View key={row.productId}>
                <View className="flex-row items-center px-4 py-3">
                  <View className="flex-[2] pr-2">
                    <Text size="sm" weight="medium" numberOfLines={2}>
                      {row.productName ?? 'Product'}
                    </Text>
                  </View>
                  <Text size="sm" className="flex-1 text-right">
                    {target.toLocaleString()}
                  </Text>
                  <Text size="sm" weight="semibold" className="flex-1 text-right">
                    {sales.toLocaleString()}
                  </Text>
                  <Text size="sm" weight="semibold" className="w-10 text-right">
                    {pct != null ? `${pct}%` : '—'}
                  </Text>
                </View>
                {target > 0 ? (
                  <View className="px-4 pb-2">
                    <ProgressBar value={sales} max={target} tone={achievementTone(pct ?? 0)} />
                  </View>
                ) : null}
                {i < rows.length - 1 ? <Divider /> : null}
              </View>
            );
          })}
        </>
      )}
    </Card>
  );
}

function TerritoryCoverageCard({ rep }: { rep: MrepOverviewRep }) {
  const { colors } = useTheme();
  const doctors = rep.coverage?.doctors ?? [];
  const green = doctors.filter((d) => d.band === 'green').length;
  const amber = doctors.filter((d) => d.band === 'amber').length;
  const red = doctors.filter((d) => d.band === 'red').length;
  const none = doctors.filter((d) => d.band === 'none').length;

  return (
    <Card className="mx-4 mt-2">
      <View className="flex-row items-center mb-3">
        <MapPin size={18} color={colors.primary} />
        <Subtitle className="ml-2">Territory coverage</Subtitle>
      </View>
      <View className="flex-row flex-wrap gap-2 mb-3">
        <Badge tone="success">{green} on target</Badge>
        <Badge tone="warning">{amber} near target</Badge>
        <Badge tone="danger">{red} below target</Badge>
        {none > 0 ? <Badge tone="muted">{none} no target</Badge> : null}
      </View>
      <Text size="xs" tone="muted">
        {fmtPct(rep.coverage?.coveragePercent)} of doctors with visit targets met this month
        {rep.coverage?.doctorsTracked
          ? ` · ${rep.coverage.doctorsTracked} doctors tracked`
          : ''}
      </Text>
    </Card>
  );
}

function WorkingDaysCard({
  repId,
  month,
  attendanceScorePercent,
}: {
  repId: string;
  month: string;
  attendanceScorePercent?: number | null;
}) {
  const q = useQuery({
    queryKey: ['attendance', 'monthly-summary', repId, month],
    queryFn: () => attendanceApi.monthlySummary(repId, month),
  });
  return (
    <Card className="mx-4 mt-2">
      <View className="flex-row items-center">
        <CalendarDays size={18} color="#6366f1" />
        <View className="ml-2 flex-1">
          <Text size="sm" weight="medium">
            Working days
          </Text>
          <Text size="lg" weight="bold">
            {workingDaysLabel(q.data)}
          </Text>
          <Text size="xs" tone="muted">
            Present (incl. half-days) / elapsed days this month
          </Text>
        </View>
        {attendanceScorePercent != null ? (
          <Badge tone="info">{fmtPct(attendanceScorePercent)} score</Badge>
        ) : null}
      </View>
    </Card>
  );
}

function TeamSummaryCard({ reps }: { reps: MrepOverviewRep[] }) {
  const agg = teamAggregate(reps);
  return (
    <Card className="mx-4 mt-2">
      <View className="flex-row items-center mb-2">
        <Users size={18} color="#2563eb" />
        <Subtitle className="ml-2">Team summary · {agg.teamSize} reps</Subtitle>
      </View>
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[45%] flex-1">
          <Text size="xs" tone="muted">
            Team achievement
          </Text>
          <Text size="lg" weight="bold">
            {fmtPct(agg.achievementPct)}
          </Text>
        </View>
        <View className="min-w-[45%] flex-1">
          <Text size="xs" tone="muted">
            Avg coverage
          </Text>
          <Text size="lg" weight="bold">
            {fmtPct(agg.avgCoverage)}
          </Text>
        </View>
        <View className="min-w-[45%] flex-1">
          <Text size="xs" tone="muted">
            Target
          </Text>
          <Text size="sm" weight="semibold">
            {fmtPkr(agg.salesTarget)}
          </Text>
        </View>
        <View className="min-w-[45%] flex-1">
          <Text size="xs" tone="muted">
            Achieved
          </Text>
          <Text size="sm" weight="semibold">
            {fmtPkr(agg.achievedSales)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function TeamRepRow({
  rep,
  onPress,
}: {
  rep: MrepOverviewRep;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const pct = rep.target?.salesAchievementPercent ?? rep.coverage?.coveragePercent ?? 0;
  return (
    <Pressable onPress={onPress} className="px-4 py-3 flex-row items-center">
      <View className="flex-1">
        <Text weight="semibold" numberOfLines={1}>
          {rep.name ?? rep.employeeCode ?? 'Rep'}
        </Text>
        <Text size="xs" tone="muted">
          Sales {fmtPkr(rep.target?.achievedSales)} · Coverage {fmtPct(rep.coverage?.coveragePercent)}
        </Text>
      </View>
      <Badge tone={achievementTone(Number(pct) || 0)}>{fmtPct(pct)}</Badge>
      <ChevronRight size={18} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
    </Pressable>
  );
}

function RepDetailView({ rep, month }: { rep: MrepOverviewRep; month: string }) {
  return (
    <>
      <AchievementCard rep={rep} />
      <WorkingDaysCard
        repId={rep.repId}
        month={month}
        attendanceScorePercent={rep.attendanceScorePercent}
      />
      <GrossSalesCard rep={rep} />
      <TerritoryCoverageCard rep={rep} />
      <ProductPerformanceCard repId={rep.repId} month={month} />
    </>
  );
}

export function KpiScreenImpl() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { can } = usePermissions();
  const canPickRep = can('team.viewAllReports') || can('admin.access');

  const [filters, setFilters] = React.useState<KpiFilters>({
    month: currentMonthYmd(),
    repId: canPickRep ? undefined : user?._id,
    repName: canPickRep ? undefined : user?.name,
  });
  const [filterOpen, setFilterOpen] = React.useState(false);

  const overviewQ = useQuery({
    queryKey: ['reports', 'mrep-overview', filters.month, canPickRep ? 'team' : filters.repId],
    queryFn: () =>
      reportsApi.monthlyOverview({
        month: filters.month,
        ...(!canPickRep && filters.repId ? { repId: String(filters.repId) } : {}),
      }),
  });

  const reps = overviewQ.data?.reps ?? [];
  const selectedRep = filters.repId
    ? reps.find((r) => String(r.repId) === String(filters.repId))
    : reps.length === 1
      ? reps[0]
      : undefined;
  const showTeamList = canPickRep && !filters.repId && reps.length > 1;
  const isTeamDrillDown = canPickRep && !!filters.repId && reps.length > 1;

  const backToTeamSummary = React.useCallback(() => {
    setFilters((f) => ({ ...f, repId: undefined, repName: undefined }));
  }, []);

  React.useEffect(() => {
    if (!isTeamDrillDown) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backToTeamSummary();
      return true;
    });
    return () => sub.remove();
  }, [isTeamDrillDown, backToTeamSummary]);

  const title = showTeamList
    ? 'Team targets & KPI'
    : selectedRep?.name
      ? `${selectedRep.name.split(' ')[0]}'s KPI`
      : 'Targets & KPI';

  function onRefresh() {
    void overviewQ.refetch();
  }

  const body =
    overviewQ.isLoading ? (
      <KpiPageSkeleton />
    ) : overviewQ.isError ? (
      <EmptyState
        title="Could not load KPIs"
        description="Pull to refresh or check your connection."
      />
    ) : reps.length === 0 ? (
      <EmptyState
        title="No data for this month"
        description="Targets and activity will appear once plans and orders are recorded."
      />
    ) : showTeamList ? (
      <>
        <TeamSummaryCard reps={reps} />
        <Card className="mx-4 mt-2 mb-4" padded={false}>
          <View className="px-4 py-3">
            <Subtitle>Team members</Subtitle>
            <Text size="xs" tone="muted">
              Tap a rep to view their full KPI report
            </Text>
          </View>
          <Divider />
          {reps.map((rep, i) => (
            <View key={rep.repId}>
              <TeamRepRow
                rep={rep}
                onPress={() =>
                  setFilters((f) => ({
                    ...f,
                    repId: rep.repId,
                    repName: rep.name ?? undefined,
                  }))
                }
              />
              {i < reps.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>
      </>
    ) : selectedRep ? (
      <RepDetailView rep={selectedRep} month={filters.month} />
    ) : (
      <EmptyState title="Select a representative" description="Use filters to pick a team member." />
    );

  return (
    <Screen padded={false} scroll={false}>
      <Header
        back
        onBack={isTeamDrillDown ? backToTeamSummary : undefined}
        title={title}
        subtitle={isTeamDrillDown ? 'Team targets & KPI' : undefined}
        right={
          canPickRep ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setFilterOpen(true)}
              hitSlop={8}
              className="p-2"
            >
              <SlidersHorizontal size={20} color={colors.foreground} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={overviewQ.isFetching && !overviewQ.isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View className="flex-row items-center justify-between mx-4 mt-1 mb-1">
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilters((f) => ({ ...f, month: shiftMonth(f.month, -1) }))}
          >
            <Text size="sm" tone="primary" weight="medium">
              ‹ Prev
            </Text>
          </Pressable>
          <Text size="sm" weight="semibold">
            {formatMonthLabel(filters.month)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilters((f) => ({ ...f, month: shiftMonth(f.month, 1) }))}
          >
            <Text size="sm" tone="primary" weight="medium">
              Next ›
            </Text>
          </Pressable>
        </View>

        {body}
      </ScrollView>

      {filterOpen ? (
        <KpiFilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          value={filters}
          onApply={setFilters}
          canPickRep={canPickRep}
          teamReps={reps.map((r) => ({ repId: r.repId, name: r.name }))}
        />
      ) : null}
    </Screen>
  );
}
