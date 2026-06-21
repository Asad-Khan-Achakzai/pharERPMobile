import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Avatar } from '@/ui/Avatar';
import { Text, H2, Subtitle } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { DetailPageSkeleton } from '@/ui/listCardSkeletons';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { masterQueries } from '@/data/masterQueries';
import { pharmaciesApi } from '@/api/pharmacies';
import { usePermissions } from '@/hooks/usePermissions';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';

export default function PharmacyProfile() {
  const pushWithReturn = usePushWithReturn();
  const { canDo } = usePermissions();
  const canCollect = canDo('collection_create');
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['pharmacy', id], queryFn: () => masterQueries.pharmacyById(id) });
  const fin = useQuery({
    queryKey: ['pharmacy', id, 'financials'],
    queryFn: () => pharmaciesApi.financials(id),
  });

  if (q.isLoading || !q.data) {
    return (
      <View className="flex-1 bg-background">
        <Header back title="Pharmacy" />
        <Screen padded={false} edges={['bottom']}>
          <DetailPageSkeleton itemRows={2} />
        </Screen>
      </View>
    );
  }
  const p = q.data;
  const outstanding = fin.data?.outstanding ?? p.outstanding ?? 0;

  return (
    <View className="flex-1 bg-background">
      <Header back title={p.name} subtitle={p.city ?? ''} />
      <Screen padded={false}>
        <Card className="mx-4 mt-2">
          <View className="flex-row items-center">
            <Avatar name={p.name} uri={p.imageUrl ?? undefined} size="lg" />
            <View className="ml-3 flex-1">
              <H2>{p.name}</H2>
              <Subtitle>{[p.address, p.city].filter(Boolean).join(', ') || '—'}</Subtitle>
            </View>
          </View>
          <View className="flex-row items-center mt-3 justify-between">
            <View>
              <Subtitle>Outstanding</Subtitle>
              <Text size="2xl" weight="bold">
                Rs {Math.round(outstanding).toLocaleString()}
              </Text>
            </View>
            <Badge tone={outstanding > 0 ? 'warning' : 'success'}>
              {outstanding > 0 ? 'Due' : 'Up to date'}
            </Badge>
          </View>
        </Card>
      </Screen>
      {canCollect ? (
        <StickyActionBar>
          <Button
            fullWidth
            onPress={() => pushWithReturn(`/payments/record-collection?pharmacyId=${id}`)}
            leftIcon={<Wallet size={18} color="#fff" />}
          >
            Record collection
          </Button>
        </StickyActionBar>
      ) : null}
    </View>
  );
}
