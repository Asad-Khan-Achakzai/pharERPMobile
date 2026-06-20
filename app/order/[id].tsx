import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Divider } from '@/ui/ListRow';
import { DetailPageSkeleton } from '@/ui/listCardSkeletons';
import { useToast } from '@/ui/Toast';
import { ordersApi } from '@/api/orders';
import type { DeliveryRecord } from '@/domain/types';

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
  const toast = useToast();
  const [openingPdf, setOpeningPdf] = React.useState<string | null>(null);
  const q = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.getById(id) });

  async function openInvoice(delivery: DeliveryRecord) {
    if (!id) return;
    setOpeningPdf(delivery._id);
    try {
      await ordersApi.openDeliveryInvoice(id, delivery._id);
    } catch (err: unknown) {
      toast.show({
        tone: 'danger',
        message: (err as Error)?.message ?? 'Could not open invoice',
      });
    } finally {
      setOpeningPdf(null);
    }
  }

  return (
    <Screen padded={false}>
      <Header back title="Order" subtitle={q.data?.orderNumber ?? id?.slice(-8)} />
      {q.isLoading || !q.data ? (
        <DetailPageSkeleton itemRows={4} />
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
          {(q.data.deliveries?.length ?? 0) > 0 ? (
            <Card className="mx-4 mt-2" padded={false}>
              <View className="px-3 py-2">
                <Subtitle>Deliveries</Subtitle>
              </View>
              <Divider />
              {q.data.deliveries!.map((delivery, i, arr) => (
                <View key={delivery._id}>
                  <View className="px-3 py-3 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text size="sm" weight="medium">
                        {delivery.invoiceNumber ? `Invoice ${delivery.invoiceNumber}` : 'Delivery'}
                      </Text>
                      <Subtitle>
                        {delivery.deliveredAt
                          ? new Date(delivery.deliveredAt).toLocaleDateString()
                          : 'Delivered'}
                      </Subtitle>
                    </View>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={openingPdf === delivery._id}
                      onPress={() => openInvoice(delivery)}
                      leftIcon={
                        openingPdf === delivery._id ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <FileText size={14} color="#2563eb" />
                        )
                      }
                    >
                      PDF
                    </Button>
                  </View>
                  {i < arr.length - 1 ? <Divider /> : null}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
