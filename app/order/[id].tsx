import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Divider } from '@/ui/ListRow';
import { SkeletonRow } from '@/ui/Skeleton';
import { ordersApi } from '@/api/orders';

const tone: Record<string, 'muted' | 'warning' | 'success' | 'danger' | 'default'> = {
  DRAFT: 'muted',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  INVOICED: 'success',
  DELIVERED: 'success',
  CANCELLED: 'muted',
};

function refName(
  ref: string | { _id?: string; name?: string } | null | undefined
): string {
  if (!ref) return '—';
  if (typeof ref === 'string') return ref.slice(-8);
  return ref.name ?? ref._id?.slice(-8) ?? '—';
}

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.getById(id) });

  return (
    <Screen padded={false}>
      <Header back title="Order" subtitle={q.data?.orderNumber ?? id?.slice(-8)} />
      {q.isLoading || !q.data ? (
        <View className="px-4">
          <SkeletonRow count={5} />
        </View>
      ) : (
        <>
          <Card className="mx-4 mt-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Subtitle>Pharmacy</Subtitle>
                <H2>{refName(q.data.pharmacyId)}</H2>
                <Text size="xs" tone="muted">
                  via {refName(q.data.distributorId)}
                </Text>
              </View>
              <Badge tone={tone[q.data.status] ?? 'default'}>{q.data.status}</Badge>
            </View>
          </Card>
          <Card className="mx-4 mt-2" padded={false}>
            <View className="px-3 py-2">
              <Subtitle>Items</Subtitle>
            </View>
            <Divider />
            {q.data.items.map((it, i, arr) => {
              const rate = it.tpAtTime ?? 0;
              const lineGross = it.grossAmount ?? it.quantity * rate;
              const line = it.netAfterPharmacy ?? lineGross;
              return (
                <View key={it._id ?? `${it.productId}-${i}`}>
                  <View className="px-3 py-3 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text size="sm" weight="medium" numberOfLines={1}>
                        {it.productName ?? String(it.productId)}
                      </Text>
                      <Subtitle>
                        {it.quantity} × Rs {rate}
                        {it.clinicDiscount ? ` · -${it.clinicDiscount}%` : ''}
                        {it.bonusQuantity ? ` · +${it.bonusQuantity} bonus` : ''}
                      </Subtitle>
                    </View>
                    <Text size="sm" weight="semibold">
                      Rs {Math.round(line).toLocaleString()}
                    </Text>
                  </View>
                  {i < arr.length - 1 ? <Divider /> : null}
                </View>
              );
            })}
            <Divider />
            <View className="px-3 py-3 flex-row items-center justify-between">
              <Text size="base" weight="semibold">
                Net total
              </Text>
              <Text size="base" weight="bold">
                Rs{' '}
                {Math.round(
                  q.data.amountAfterPharmacyDiscount ?? q.data.totalAmount ?? 0
                ).toLocaleString()}
              </Text>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
