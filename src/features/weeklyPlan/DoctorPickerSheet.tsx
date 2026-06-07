import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Sheet } from '@/ui/Sheet';
import { Text, Label } from '@/ui/Text';
import { SearchField } from '@/ui/SearchField';
import { Badge } from '@/ui/Badge';
import { PressableCard } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { SkeletonRow } from '@/ui/Skeleton';
import { masterQueries } from '@/data/masterQueries';
import { useRecommendedDoctors } from '@/hooks/useRecommendedDoctors';
import { useAuthStore } from '@/state/authStore';
import type { Doctor, User } from '@/domain/types';
import type { RecommendedDoctorMeta } from '@/hooks/useRecommendedDoctors';

interface DoctorPickerSheetProps {
  open: boolean;
  onClose: () => void;
  selected: Doctor[];
  onConfirm: (doctors: Doctor[]) => void;
  title?: string;
  /** Rep whose bricks/assignment drive suggestions (defaults to signed-in user). */
  coverageUser?: User | null;
}

function DoctorRow({
  doctor,
  meta,
  selected,
  onToggle,
}: {
  doctor: Doctor;
  meta?: RecommendedDoctorMeta | null;
  selected: boolean;
  onToggle: () => void;
}) {
  const badgeLabel =
    meta?.reason === 'assigned' ? 'Recommended' : meta ? 'Your territory' : null;
  const subtitle =
    meta?.reason === 'assigned'
      ? 'Assigned to you'
      : meta?.brickName
        ? meta.brickName
        : [doctor.specialization, doctor.city, doctor.doctorBrick].filter(Boolean).join(' · ');

  return (
    <PressableCard className="mb-2" onPress={onToggle}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text size="sm" weight={selected ? 'semibold' : 'medium'}>
              {doctor.name}
            </Text>
            {badgeLabel ? <Badge tone="success">{badgeLabel}</Badge> : null}
          </View>
          {subtitle ? (
            <Text size="xs" tone="muted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {selected ? <Check size={18} color="#16a34a" /> : null}
      </View>
    </PressableCard>
  );
}

export const DoctorPickerSheet: React.FC<DoctorPickerSheetProps> = ({
  open,
  onClose,
  selected,
  onConfirm,
  title = 'Add doctors',
  coverageUser,
}) => {
  const authUser = useAuthStore((s) => s.user);
  const repUser = coverageUser ?? authUser;
  const [q, setQ] = React.useState('');
  const [draft, setDraft] = React.useState<Doctor[]>([]);

  const rec = useRecommendedDoctors(repUser, { enabled: open });

  React.useEffect(() => {
    if (open) {
      setDraft(selected);
      setQ('');
    }
  }, [open, selected]);

  const searchEnabled = q.trim().length >= 2;
  const lookupQ = useQuery({
    queryKey: ['doctors', 'lookup', 'plan-picker', q],
    enabled: open && searchEnabled,
    queryFn: () => masterQueries.doctorsLookup({ search: q.trim(), isActive: 'true', limit: 30 }),
  });

  const { recommended: searchRec, others: searchOthers } = React.useMemo(() => {
    if (!searchEnabled) return { recommended: [] as Doctor[], others: [] as Doctor[] };
    return rec.partitionLookupResults(lookupQ.data ?? []);
  }, [searchEnabled, q, lookupQ.data, rec]);

  function toggle(d: Doctor) {
    setDraft((prev) => {
      if (prev.some((x) => x._id === d._id)) return prev.filter((x) => x._id !== d._id);
      return [...prev, d];
    });
  }

  const suggestedIds = new Set(rec.suggestedDoctors.map((d) => String(d._id)));

  const footer = (
    <View className="flex-row">
      <Button variant="outline" className="flex-1 mr-2" onPress={onClose}>
        Cancel
      </Button>
      <Button
        className="flex-1"
        onPress={() => {
          onConfirm(draft);
          onClose();
        }}
      >
        {`Add (${draft.length})`}
      </Button>
    </View>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      scrollable
      snapPoints={['92%']}
      initialSnapIndex={0}
      footer={footer}
    >
      <SearchField
        value={q}
        onChangeText={setQ}
        placeholder="Search all doctors (min 2 chars)"
      />
      <Text size="xs" tone="muted" className="mt-2 mb-2">
        Tap multiple doctors, then Add. No restrictions — suggested first.
      </Text>

      {searchEnabled ? (
        <>
          {lookupQ.isLoading ? <SkeletonRow count={2} /> : null}
          {searchRec.length > 0 ? (
            <View className="mb-3">
              <Label className="mb-2">Suggested</Label>
              {searchRec.map((d) => (
                <DoctorRow
                  key={d._id}
                  doctor={d}
                  meta={rec.isRecommended(d._id)}
                  selected={draft.some((x) => x._id === d._id)}
                  onToggle={() => toggle(d)}
                />
              ))}
            </View>
          ) : null}
          {searchOthers.length > 0 ? (
            <View className="mb-3">
              <Label className="mb-2">All doctors</Label>
              {searchOthers.map((d) => (
                <DoctorRow
                  key={d._id}
                  doctor={d}
                  selected={draft.some((x) => x._id === d._id)}
                  onToggle={() => toggle(d)}
                />
              ))}
            </View>
          ) : null}
          {!lookupQ.isLoading && searchRec.length === 0 && searchOthers.length === 0 ? (
            <Text size="sm" tone="muted" className="py-4 text-center">
              No doctors match your search.
            </Text>
          ) : null}
        </>
      ) : (
        <>
          {rec.prefetchLoading ? <SkeletonRow count={3} /> : null}

          {rec.prefetchError ? (
            <View className="mb-3">
              <Text size="sm" tone="danger" className="mb-2">
                Could not load territory doctors.
              </Text>
              <Button size="sm" variant="outline" onPress={() => rec.refetchPrefetch()}>
                Retry
              </Button>
            </View>
          ) : null}

          {rec.suggestedDoctors.length > 0 ? (
            <View className="mb-3">
              <Label className="mb-2">Suggested</Label>
              {rec.suggestedDoctors.map((d) => (
                <DoctorRow
                  key={d._id}
                  doctor={d}
                  meta={rec.isRecommended(d._id)}
                  selected={draft.some((x) => x._id === d._id)}
                  onToggle={() => toggle(d)}
                />
              ))}
            </View>
          ) : null}

          {rec.doctorsByBrick.map((group) => {
            const brickOnly = group.doctors.filter((d) => !suggestedIds.has(String(d._id)));
            if (!brickOnly.length) return null;
            return (
              <View key={group.brickName} className="mb-3">
                <Label className="mb-2">{group.brickName}</Label>
                {brickOnly.map((d) => (
                  <DoctorRow
                    key={d._id}
                    doctor={d}
                    meta={rec.isRecommended(d._id)}
                    selected={draft.some((x) => x._id === d._id)}
                    onToggle={() => toggle(d)}
                  />
                ))}
              </View>
            );
          })}

          {!rec.prefetchLoading &&
          !rec.prefetchError &&
          rec.suggestedDoctors.length === 0 &&
          rec.doctorsByBrick.every((g) => g.doctors.length === 0) ? (
            <Text size="sm" tone="muted" className="py-2 text-center">
              No territory doctors found — search above to add any doctor.
            </Text>
          ) : null}
        </>
      )}
    </Sheet>
  );
};
