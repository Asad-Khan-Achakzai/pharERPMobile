import * as React from 'react';
import { View, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { SearchField } from '@/ui/SearchField';
import { useTheme } from '@/theme/ThemeProvider';
import { usersApi, type AssignableUser } from '@/api/users';
import type { ID } from '@/domain/types';
import { formatMonthLabel, shiftMonth } from './kpiUtils';

export interface KpiFilters {
  month: string;
  repId?: ID;
  repName?: string;
}

interface KpiFilterSheetProps {
  open: boolean;
  onClose: () => void;
  value: KpiFilters;
  onApply: (next: KpiFilters) => void;
  canPickRep: boolean;
  teamReps?: { repId: string; name?: string | null }[];
}

export const KpiFilterSheet: React.FC<KpiFilterSheetProps> = ({
  open,
  onClose,
  value,
  onApply,
  canPickRep,
  teamReps,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = React.useState<KpiFilters>(value);
  const [repSearch, setRepSearch] = React.useState('');
  const [repHits, setRepHits] = React.useState<AssignableUser[]>([]);

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  React.useEffect(() => {
    if (!open || !canPickRep) return;
    let cancel = false;
    const q = repSearch.trim();
    void usersApi.assignable(q, 20, 'team').then((rows) => {
      if (!cancel) setRepHits(rows);
    });
    return () => {
      cancel = true;
    };
  }, [open, canPickRep, repSearch]);

  const repOptions = React.useMemo(() => {
    const fromOverview = (teamReps ?? []).map((r) => ({
      _id: r.repId,
      name: r.name ?? 'Rep',
    }));
    const merged = new Map<string, AssignableUser>();
    for (const r of fromOverview) merged.set(String(r._id), r);
    for (const r of repHits) merged.set(String(r._id), r);
    return [...merged.values()];
  }, [teamReps, repHits]);

  function apply() {
    onApply(draft);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Filters" snapPoints={['55%', '88%']} scrollable>
      <View className="px-4 pb-2">
        <Text size="sm" weight="medium" className="mb-2">
          Month
        </Text>
        <View className="flex-row items-center justify-between rounded-xl border px-2 py-2" style={{ borderColor: colors.border }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft((d) => ({ ...d, month: shiftMonth(d.month, -1) }))}
            hitSlop={8}
          >
            <ChevronLeft size={22} color={colors.foreground} />
          </Pressable>
          <Text weight="semibold">{formatMonthLabel(draft.month)}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft((d) => ({ ...d, month: shiftMonth(d.month, 1) }))}
            hitSlop={8}
          >
            <ChevronRight size={22} color={colors.foreground} />
          </Pressable>
        </View>

        {canPickRep ? (
          <>
            <Text size="sm" weight="medium" className="mt-4 mb-2">
              Representative
            </Text>
            <Pressable
              onPress={() => setDraft((d) => ({ ...d, repId: undefined, repName: undefined }))}
              className="rounded-xl border px-3 py-3 mb-2"
              style={{
                borderColor: !draft.repId ? colors.primary : colors.border,
                backgroundColor: !draft.repId ? colors.primaryMuted : colors.muted,
              }}
            >
              <Text weight={!draft.repId ? 'semibold' : 'medium'}>All team (summary)</Text>
            </Pressable>
            <SearchField
              value={repSearch}
              onChangeText={setRepSearch}
              placeholder="Search team member…"
              className="mb-2"
            />
            {repOptions.map((r) => {
              const selected = String(draft.repId) === String(r._id);
              return (
                <Pressable
                  key={String(r._id)}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      repId: r._id,
                      repName: r.name,
                    }))
                  }
                  className="rounded-xl border px-3 py-3 mb-2"
                  style={{
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primaryMuted : colors.background,
                  }}
                >
                  <Text weight={selected ? 'semibold' : 'medium'}>{r.name}</Text>
                </Pressable>
              );
            })}
          </>
        ) : null}

        <Button className="mt-4" onPress={apply}>
          Apply filters
        </Button>
      </View>
    </Sheet>
  );
};
