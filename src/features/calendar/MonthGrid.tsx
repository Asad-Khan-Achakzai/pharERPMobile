/**
 * Read-only month grid for the Calendar Module (mobile).
 *
 * Pure presentation: it receives already-transformed events from the backend
 * engine and renders a 6-week grid with per-day category dots. It never derives
 * business state — it only groups events by their `start` day for display.
 */
import * as React from 'react';
import { View, Pressable } from 'react-native';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Text } from '@/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { CalendarCategory, CalendarEvent } from '@/api/calendar';
import { CALENDAR_CATEGORIES, CALENDAR_CATEGORY_DOT } from './calendarMeta';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface MonthGridProps {
  /** Anchor date for the displayed month. */
  monthDate: Date;
  events: CalendarEvent[];
  selectedYmd: string;
  todayYmd: string;
  onSelectDay: (ymd: string) => void;
}

function buildCategoryMap(events: CalendarEvent[]): Map<string, Set<CalendarCategory>> {
  const map = new Map<string, Set<CalendarCategory>>();
  for (const e of events) {
    const ymd = e.start;
    if (!ymd) continue;
    let set = map.get(ymd);
    if (!set) {
      set = new Set<CalendarCategory>();
      map.set(ymd, set);
    }
    set.add(e.extendedProps.category);
  }
  return map;
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  monthDate,
  events,
  selectedYmd,
  todayYmd,
  onSelectDay,
}) => {
  const { colors } = useTheme();

  const days = React.useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthDate]);

  const categoryMap = React.useMemo(() => buildCategoryMap(events), [events]);

  return (
    <View>
      <View className="flex-row">
        {WEEKDAYS.map((d) => (
          <View key={d} style={{ width: `${100 / 7}%` }} className="items-center py-1">
            <Text size="2xs" tone="muted" weight="medium">
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((day) => {
          const ymd = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, monthDate);
          const isSelected = ymd === selectedYmd;
          const isToday = ymd === todayYmd;
          const cats = categoryMap.get(ymd);
          const orderedCats = cats ? CALENDAR_CATEGORIES.filter((c) => cats.has(c)) : [];

          return (
            <Pressable
              key={ymd}
              onPress={() => onSelectDay(ymd)}
              style={{ width: `${100 / 7}%` }}
              className="items-center py-1"
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                  borderWidth: isToday && !isSelected ? 1 : 0,
                  borderColor: colors.primary,
                }}
              >
                <Text
                  size="sm"
                  weight={isSelected || isToday ? 'semibold' : 'normal'}
                  style={{
                    color: isSelected
                      ? colors.primaryForeground
                      : inMonth
                        ? colors.foreground
                        : colors.mutedForeground,
                  }}
                >
                  {format(day, 'd')}
                </Text>
              </View>

              <View className="flex-row items-center justify-center mt-1" style={{ height: 6 }}>
                {orderedCats.slice(0, 4).map((c) => (
                  <View
                    key={c}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      marginHorizontal: 1,
                      backgroundColor: isSelected ? colors.primaryForeground : CALENDAR_CATEGORY_DOT[c],
                    }}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/** Visible YYYY-MM-DD range (6-week grid) for a given month — used to fetch events. */
export function monthGridRange(monthDate: Date): { from: string; to: string } {
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const gridEnd = addDays(startOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 }), 6);
  return { from: format(gridStart, 'yyyy-MM-dd'), to: format(gridEnd, 'yyyy-MM-dd') };
}
