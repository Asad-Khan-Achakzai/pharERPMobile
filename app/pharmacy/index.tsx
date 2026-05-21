import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { SearchField } from '@/ui/SearchField';
import { PressableCard } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { pharmaciesApi } from '@/api/pharmacies';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/auth/PermissionGate';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';

function PharmaciesScreenImpl() {
  const { canDo } = usePermissions();
  const pushWithReturn = usePushWithReturn();
  const [q, setQ] = React.useState('');
  const list = useQuery({
    queryKey: ['pharmacies', q.trim()],
    queryFn: () => pharmaciesApi.list({ search: q.trim() || undefined, limit: 50 }),
    placeholderData: (prev) => prev,
  });

  return (
    <Screen padded={false} scroll={false}>
      <Header
        back
        title="Pharmacies"
        right={
          canDo('pharmacy_create') ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Plus size={14} color="#0f172a" />}
              onPress={() => pushWithReturn('/pharmacy/new')}
            >
              New
            </Button>
          ) : undefined
        }
      />
      <View className="px-4 pb-2">
        <SearchField value={q} onChangeText={setQ} placeholder="Search by name or city" />
      </View>
      {list.isLoading ? (
        <View className="px-4">
          <SkeletonRow count={6} />
        </View>
      ) : (list.data?.items ?? []).length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} color="#94a3b8" />}
          title="No pharmacies"
          description="Your admin needs to add pharmacies to your territory."
        />
      ) : (
        <FlatList
          data={list.data!.items}
          keyExtractor={(p) => p._id}
          contentContainerClassName="px-4 pb-8"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <PressableCard onPress={() => pushWithReturn(`/pharmacy/${item._id}`)}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text size="base" weight="semibold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text size="xs" tone="muted" numberOfLines={1}>
                    {item.city ?? ''}
                  </Text>
                </View>
                {item.outstanding ? (
                  <Badge tone="warning">Rs {Math.round(item.outstanding).toLocaleString()}</Badge>
                ) : null}
              </View>
            </PressableCard>
          )}
        />
      )}
    </Screen>
  );
}

export default function PharmaciesScreen() {
  return (
    <PermissionGate screen="pharmacy_view" title="Pharmacies">
      <PharmaciesScreenImpl />
    </PermissionGate>
  );
}
