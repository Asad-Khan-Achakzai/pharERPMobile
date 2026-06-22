/**
 * Calendar (mobile) — read-only field-execution calendar.
 *
 * Visualises existing ERP data (plan visits + attendance) returned by the
 * backend calendar engine. It authors nothing; taps deep-link into existing
 * screens. Logic (transformation / KPIs / scope) stays server-side — this
 * screen only renders the typed payload (Web Parity Contract).
 */
import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format, parseISO } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card, PressableCard } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { EmptyState, ThemedEmptyIcon, ErrorState } from '@/ui/EmptyState';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { useTheme } from '@/theme/ThemeProvider';
import { PermissionGate } from '@/auth/PermissionGate';
import { hasAnyPermission } from '@/auth/rbac';
import { useAuthStore } from '@/state/authStore';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { calendarApi, type CalendarEvent, type CalendarScope } from '@/api/calendar';
import { MonthGrid, monthGridRange } from '@/features/calendar/MonthGrid';
import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_LABEL,
  CALENDAR_CATEGORY_SUMMARY_KEY,
  CALENDAR_CATEGORY_TONE,
} from '@/features/calendar/calendarMeta';

/** Map a server (web) deep-link to the equivalent mobile route, when one exists. */
function mobileRouteForEvent(e: CalendarEvent): string | null {
  const ext = e.extendedProps;
  if (ext.sourceType === 'PLAN_ITEM') {
    const m = ext.deepLink?.match(/weekly-plans\/([^/?#]+)/);
    if (m) return `/plan/${m[1]}`;
  }
  return null;
}

function CalendarImpl() {
  const { colors } = useTheme();
  const pushWithReturn = usePushWithReturn();
  const user = useAuthStore((s) => s.user);
  const canSeeTeam = hasAnyPermission(user, ['team.viewAllReports', 'admin.access']);

  const todayYmd = format(new Date(), 'yyyy-MM-dd');
  const [monthDate, setMonthDate] = React.useState<Date>(new Date());
  const [selectedYmd, setSelectedYmd] = React.useState<string>(todayYmd);
  const [scope, setScope] = React.useState<CalendarScope>('mine');

  const range = React.useMemo(() => monthGridRange(monthDate), [monthDate]);

  const query = useQuery({
    queryKey: ['calendar', scope, range.from, range.to],
    queryFn: () => calendarApi.events({ from: range.from, to: range.to, scope }),
  });

  const payload = query.data;
  const events = payload?.events ?? [];
  const summary = payload?.summary;

  const dayEvents = React.useMemo(
    () => events.filter((e) => e.start === selectedYmd),
    [events, selectedYmd],
  );

  const goToday = React.useCallback(() => {
    setMonthDate(new Date());
    setSelectedYmd(todayYmd);
  }, [todayYmd]);

  const shiftMonth = React.useCallback((delta: number) => {
    setMonthDate((d) => addMonths(d, delta));
  }, []);

  return (
    <Screen padded={false} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Header back title="Calendar" subtitle="Your field schedule at a glance" />

      <View className="px-4 pt-3">
        {canSeeTeam ? (
          <View className="flex-row mb-3">
            <Button
              size="sm"
              variant={scope === 'mine' ? 'primary' : 'outline'}
              className="mr-2"
              onPress={() => setScope('mine')}
            >
              My calendar
            </Button>
            <Button
              size="sm"
              variant={scope === 'team' ? 'primary' : 'outline'}
              onPress={() => setScope('team')}
            >
              Team
            </Button>
          </View>
        ) : null}

        {/* Month navigation */}
        <View className="flex-row items-center justify-between mb-2">
          <Button
            size="sm"
            variant="ghost"
            onPress={() => shiftMonth(-1)}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </Button>
          <Text size="md" weight="semibold">
            {format(monthDate, 'MMMM yyyy')}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => shiftMonth(1)}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={20} color={colors.foreground} />
          </Button>
        </View>

        {/* KPI chips (single source: server summary for this scope + range) */}
        {summary ? (
          <View className="flex-row flex-wrap gap-2 mb-2">
            {CALENDAR_CATEGORIES.map((c) => (
              <Badge key={c} tone={CALENDAR_CATEGORY_TONE[c]}>
                {`${CALENDAR_CATEGORY_LABEL[c]}: ${summary[CALENDAR_CATEGORY_SUMMARY_KEY[c]] ?? 0}`}
              </Badge>
            ))}
            {summary.coveragePct !== null ? (
              <Badge tone="info">{`Coverage: ${summary.coveragePct}%`}</Badge>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Month grid */}
      <Card className="mx-4 mt-1">
        {query.isLoading ? (
          <View className="py-10 items-center">
            <Text size="sm" tone="muted">
              Loading calendar…
            </Text>
          </View>
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : (
          <MonthGrid
            monthDate={monthDate}
            events={events}
            selectedYmd={selectedYmd}
            todayYmd={todayYmd}
            onSelectDay={setSelectedYmd}
          />
        )}
      </Card>

      {/* Selected day events */}
      <View className="px-4 mt-4">
        <Text size="xs" weight="semibold" tone="muted" className="uppercase mb-2">
          {format(parseISO(selectedYmd), 'EEEE, d MMMM yyyy')}
        </Text>

        {query.isLoading ? (
          <ListSkeletonList count={3} variant="visit" className="px-0 pt-0" />
        ) : dayEvents.length === 0 ? (
          <EmptyState
            icon={<ThemedEmptyIcon Icon={CalendarDays} />}
            title="Nothing scheduled"
            description="No visits or attendance recorded for this day."
          />
        ) : (
          <View className="pb-8">
            {dayEvents.map((e) => (
              <DayEventRow key={e.id} event={e} onOpen={pushWithReturn} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function DayEventRow({
  event,
  onOpen,
}: {
  event: CalendarEvent;
  onOpen: (route: string) => void;
}) {
  const ext = event.extendedProps;
  const route = mobileRouteForEvent(event);

  const body = (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 pr-2">
        <Text size="base" weight="semibold" numberOfLines={1}>
          {event.title}
        </Text>
        {ext.subtitle ? <Subtitle numberOfLines={1}>{ext.subtitle}</Subtitle> : null}
      </View>
      <Badge tone={CALENDAR_CATEGORY_TONE[ext.category]}>{ext.statusLabel}</Badge>
    </View>
  );

  if (route) {
    return (
      <PressableCard className="mb-2" onPress={() => onOpen(route)}>
        {body}
      </PressableCard>
    );
  }
  return <Card className="mb-2">{body}</Card>;
}

export default function CalendarScreen() {
  return (
    <PermissionGate screen="calendar" title="Calendar">
      <CalendarImpl />
    </PermissionGate>
  );
}
