import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { SearchField } from '@/ui/SearchField';
import { PressableCard } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { Avatar } from '@/ui/Avatar';
import { Badge } from '@/ui/Badge';
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { FAB } from '@/ui/FAB';
import { masterQueries } from '@/data/masterQueries';
import { usePermissions } from '@/hooks/usePermissions';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';

export default function DoctorsScreen() {
  const { canDo } = usePermissions();
  const canCreate = canDo('doctor_create');
  const pushWithReturn = usePushWithReturn();
  const [q, setQ] = React.useState('');

  const list = useQuery({
    queryKey: ['doctors', q.trim()],
    queryFn: () => masterQueries.doctorsList({ search: q.trim() || undefined, limit: 50 }),
    placeholderData: (prev) => prev,
  });

  return (
    <Screen padded={false} scroll={false}>
      <Header title="Doctors" />
      <View className="px-4 pb-2">
        <SearchField value={q} onChangeText={setQ} placeholder="Search by name, city" />
      </View>
      {list.isLoading ? (
        <View className="px-4">
          <SkeletonRow count={6} />
        </View>
      ) : (list.data?.items ?? []).length === 0 ? (
        <EmptyState
          icon={<Users size={28} color="#94a3b8" />}
          title="No doctors yet"
          description="Add your first doctor or sync your territory roster from the web app."
        />
      ) : (
        <FlatList
          data={list.data!.items}
          keyExtractor={(d) => d._id}
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
          contentContainerClassName="px-4 pb-24"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <PressableCard onPress={() => pushWithReturn(`/doctor/${item._id}`)}>
              <View className="flex-row items-center">
                <Avatar name={item.name} size="md" />
                <View className="flex-1 ml-3">
                  <Text size="base" weight="semibold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text size="xs" tone="muted" numberOfLines={1}>
                    {[item.specialization, item.city].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {item.isActive === false ? <Badge tone="muted">Inactive</Badge> : null}
              </View>
            </PressableCard>
          )}
        />
      )}
      {canCreate ? (
        <FAB
          onPress={() => pushWithReturn('/doctor/new')}
          icon={<Plus size={22} color="#fff" />}
          accessibilityLabel="Add doctor"
        />
      ) : null}
    </Screen>
  );
}
