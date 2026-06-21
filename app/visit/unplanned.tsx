import * as React from 'react';
import { View, SectionList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { SearchField } from '@/ui/SearchField';
import { PressableCard } from '@/ui/Card';
import { Text, Label } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Avatar } from '@/ui/Avatar';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { masterQueries } from '@/data/masterQueries';
import { PermissionGate } from '@/auth/PermissionGate';
import { useRecommendedDoctors } from '@/hooks/useRecommendedDoctors';
import { useAuthStore } from '@/state/authStore';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { formatDoctorSubtitle } from '@/features/doctors/doctorDisplay';
import type { Doctor } from '@/domain/types';
import type { RecommendedDoctorMeta } from '@/hooks/useRecommendedDoctors';

function DoctorPickRow({
  doctor,
  meta,
  onPress,
}: {
  doctor: Doctor;
  meta?: RecommendedDoctorMeta | null;
  onPress: () => void;
}) {
  const badgeLabel =
    meta?.reason === 'assigned' ? 'Recommended' : meta ? 'Your territory' : null;
  const subtitle = formatDoctorSubtitle(doctor, meta);

  return (
    <PressableCard className="mb-2" onPress={onPress}>
      <View className="flex-row items-center">
        <Avatar name={doctor.name} uri={doctor.imageUrl ?? undefined} />
        <View className="flex-1 ml-3">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text size="base" weight="semibold" numberOfLines={1}>
              {doctor.name}
            </Text>
            {badgeLabel ? <Badge tone="success">{badgeLabel}</Badge> : null}
          </View>
          <Text size="xs" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
    </PressableCard>
  );
}

function UnplannedVisitPickerImpl() {
  const pushWithReturn = usePushWithReturn();
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = React.useState('');
  const rec = useRecommendedDoctors(user, { enabled: true });

  const searchEnabled = q.trim().length >= 2;
  const lookupQ = useQuery({
    queryKey: ['doctors', 'lookup', 'visit-start', q],
    enabled: searchEnabled,
    queryFn: () => masterQueries.doctorsLookup({ search: q.trim(), isActive: 'true', limit: 40 }),
  });

  const { recommended: searchRec, others: searchOthers } = React.useMemo(() => {
    if (!searchEnabled) return { recommended: [] as Doctor[], others: [] as Doctor[] };
    return rec.partitionLookupResults(lookupQ.data ?? []);
  }, [searchEnabled, lookupQ.data, rec]);

  const suggestedIds = new Set(rec.suggestedDoctors.map((d) => String(d._id)));

  const browseSections = React.useMemo(() => {
    const sections: { title: string; data: Doctor[] }[] = [];
    if (rec.suggestedDoctors.length > 0) {
      sections.push({ title: 'Suggested', data: rec.suggestedDoctors });
    }
    for (const group of rec.doctorsByBrick) {
      const rows = group.doctors.filter((d) => !suggestedIds.has(String(d._id)));
      if (rows.length) sections.push({ title: group.brickName, data: rows });
    }
    return sections;
  }, [rec.suggestedDoctors, rec.doctorsByBrick, suggestedIds]);

  function openDoctor(id: string) {
    pushWithReturn(`/visit/unplanned/${id}`);
  }

  return (
    <Screen padded={false} scroll={false} edges={['top']}>
      <Header back title="Start visit" subtitle="Choose a doctor" />

      <View className="px-4 py-3 bg-background border-b border-border">
        <SearchField
          value={q}
          onChangeText={setQ}
          placeholder="Search all doctors (min 2 chars)"
        />
        <Text size="xs" tone="muted" className="mt-2">
          Suggested doctors appear first — you can pick anyone in the company.
        </Text>
      </View>

      {searchEnabled ? (
        lookupQ.isLoading ? (
          <View className="px-4 pt-3">
            <ListSkeletonList count={4} variant="avatar" />
          </View>
        ) : (
          <SectionList
            className="flex-1"
            sections={[
              ...(searchRec.length
                ? [{ title: 'Suggested matches', data: searchRec }]
                : []),
              ...(searchOthers.length
                ? [{ title: 'All doctors', data: searchOthers }]
                : []),
            ]}
            keyExtractor={(d) => d._id}
            contentContainerClassName="px-4 pt-3 pb-24"
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <Text size="sm" tone="muted" className="py-6 text-center">
                No doctors match your search.
              </Text>
            }
            renderSectionHeader={({ section: { title } }) => (
              <Label className="mb-2 mt-1">{title}</Label>
            )}
            renderItem={({ item, section }) => (
              <DoctorPickRow
                doctor={item}
                meta={
                  section.title === 'Suggested matches'
                    ? rec.isRecommended(item._id)
                    : null
                }
                onPress={() => openDoctor(String(item._id))}
              />
            )}
          />
        )
      ) : rec.prefetchLoading ? (
        <ListSkeletonList count={4} variant="avatar" className="px-4 pt-3" />
      ) : browseSections.length > 0 ? (
        <SectionList
          className="flex-1"
          sections={browseSections}
          keyExtractor={(d) => d._id}
          contentContainerClassName="px-4 pt-2 pb-24"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section: { title } }) => (
            <Label className="mb-2 mt-2">{title}</Label>
          )}
          renderItem={({ item }) => (
            <DoctorPickRow
              doctor={item}
              meta={rec.isRecommended(item._id)}
              onPress={() => openDoctor(String(item._id))}
            />
          )}
        />
      ) : (
        <View className="px-4 pt-4">
          <Text size="sm" tone="muted" className="text-center">
            No territory doctors loaded — search above to find a doctor.
          </Text>
        </View>
      )}
    </Screen>
  );
}

export default function UnplannedVisitPicker() {
  return (
    <PermissionGate screen="visit_unplanned" title="Start visit">
      <UnplannedVisitPickerImpl />
    </PermissionGate>
  );
}
