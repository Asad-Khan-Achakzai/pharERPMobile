/**
 * Order Detail (Mobile) — Web Parity Contract
 *
 *  Web reference: `pharmaERPFE/src/views/orders/OrderDetailPage.tsx`
 *  Backend routes: `POST /orders/:id/deliver`, `POST /orders/:id/return`
 *  Backend validators: `deliverOrderSchema`, `returnOrderSchema`
 *
 *  Deliver / Return buttons mirror the web gates exactly:
 *    - Deliver shows when `orders.deliver` AND status ∈ {PENDING, PARTIALLY_DELIVERED}
 *    - Return  shows when `orders.return`  AND status ∈ {DELIVERED, PARTIALLY_DELIVERED, PARTIALLY_RETURNED}
 *  Admin auto-grant is handled inside `hasPermission` (see `usePermissions`).
 */
import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Divider } from '@/ui/ListRow';
import { DetailPageSkeleton } from '@/ui/listCardSkeletons';
import {
  OrderActionSheet,
  type DeliverLineRow,
  type ReturnLineRow,
} from '@/features/orders/OrderActionSheet';
import { useToast } from '@/ui/Toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
  ordersApi,
  type DeliverLineInput,
  type ReturnLineInput,
} from '@/api/orders';
import { ApiError } from '@/api/client';
import type { DeliveryRecord, ID, OrderItem } from '@/domain/types';

const tone: Record<string, 'muted' | 'warning' | 'success' | 'danger' | 'default'> = {
  DRAFT: 'muted',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  INVOICED: 'success',
  DELIVERED: 'success',
  PARTIALLY_DELIVERED: 'warning',
  PARTIALLY_RETURNED: 'warning',
  RETURNED: 'danger',
  CANCELLED: 'muted',
};

/** Web parity: only these statuses allow a (further) delivery. */
const DELIVERABLE_STATUSES = ['PENDING', 'PARTIALLY_DELIVERED'];
/** Web parity: only these statuses allow a return. */
const RETURNABLE_STATUSES = ['DELIVERED', 'PARTIALLY_DELIVERED', 'PARTIALLY_RETURNED'];

function refName(
  ref: string | { _id?: string; name?: string } | null | undefined
): string {
  if (!ref) return '—';
  if (typeof ref === 'string') return ref.slice(-8);
  return ref.name ?? ref._id?.slice(-8) ?? '—';
}

/** Extract a product id whether the field is a string or a populated object. */
function productIdOf(item: OrderItem): ID {
  const raw = item.productId as unknown;
  if (raw && typeof raw === 'object') {
    return ((raw as { _id?: ID })._id ?? '') as ID;
  }
  return raw as ID;
}

/** Mirrors web `lineTotalQuantity`: paid + bonus. */
function lineTotalQuantity(item: OrderItem): number {
  return (Number(item.quantity) || 0) + (Number(item.bonusQuantity) || 0);
}

function actionErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { canDo } = usePermissions();
  const [openingPdf, setOpeningPdf] = React.useState<string | null>(null);
  const [deliverOpen, setDeliverOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [deliverItems, setDeliverItems] = React.useState<DeliverLineRow[]>([]);
  const [returnItems, setReturnItems] = React.useState<ReturnLineRow[]>([]);
  const [deliverError, setDeliverError] = React.useState<string | null>(null);
  const [returnError, setReturnError] = React.useState<string | null>(null);
  const q = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.getById(id) });

  const order = q.data;
  const status = order?.status ?? '';
  const canDeliver = canDo('order_deliver') && DELIVERABLE_STATUSES.includes(status);
  const canReturn = canDo('order_return') && RETURNABLE_STATUSES.includes(status);
  const canEditPending = canDo('order_edit') && status === 'PENDING';

  function refreshOrder() {
    qc.invalidateQueries({ queryKey: ['order', id] });
    qc.invalidateQueries({ queryKey: ['orders', 'list'] });
  }

  function closeDeliverSheet() {
    setDeliverOpen(false);
    setDeliverItems([]);
    setDeliverError(null);
  }

  function closeReturnSheet() {
    setReturnOpen(false);
    setReturnItems([]);
    setReturnError(null);
  }

  function handleDeliverItemsChange(updater: React.SetStateAction<DeliverLineRow[]>) {
    setDeliverError(null);
    setDeliverItems(updater);
  }

  function handleReturnItemsChange(updater: React.SetStateAction<ReturnLineRow[]>) {
    setReturnError(null);
    setReturnItems(updater);
  }

  const deliver = useMutation({
    mutationFn: (items: DeliverLineInput[]) => ordersApi.deliver(id, items),
    onSuccess: () => {
      closeDeliverSheet();
      toast.show({ tone: 'success', message: 'Delivery recorded' });
      refreshOrder();
    },
    onError: (err: unknown) => {
      setDeliverError(actionErrorMessage(err, 'Delivery failed'));
    },
  });

  const returnMut = useMutation({
    mutationFn: (items: ReturnLineInput[]) => ordersApi.returnOrder(id, items),
    onSuccess: () => {
      closeReturnSheet();
      toast.show({ tone: 'success', message: 'Return recorded' });
      refreshOrder();
    },
    onError: (err: unknown) => {
      setReturnError(actionErrorMessage(err, 'Return failed'));
    },
  });

  function openDeliver() {
    const rows: DeliverLineRow[] = (order?.items ?? [])
      .map((it) => {
        const lineMax = lineTotalQuantity(it);
        const remaining = lineMax - (Number(it.deliveredQty) || 0);
        return {
          productId: productIdOf(it),
          productName: it.productName ?? String(productIdOf(it)),
          maxQty: remaining,
          quantity: remaining,
        };
      })
      .filter((r) => r.maxQty > 0);
    setDeliverItems(rows);
    setDeliverError(null);
    setDeliverOpen(true);
  }

  function openReturn() {
    const rows: ReturnLineRow[] = (order?.items ?? [])
      .map((it) => {
        const remaining = (Number(it.deliveredQty) || 0) - (Number(it.returnedQty) || 0);
        return {
          productId: productIdOf(it),
          productName: it.productName ?? String(productIdOf(it)),
          maxQty: remaining,
          quantity: 0,
          reason: '',
        };
      })
      .filter((r) => r.maxQty > 0);
    setReturnItems(rows);
    setReturnError(null);
    setReturnOpen(true);
  }

  function confirmDeliver() {
    const valid = deliverItems
      .filter((i) => i.quantity > 0)
      .map((i) => ({ productId: i.productId, quantity: i.quantity }));
    if (valid.length === 0) {
      setDeliverError('Select items to deliver');
      return;
    }
    setDeliverError(null);
    deliver.mutate(valid);
  }

  function confirmReturn() {
    const valid = returnItems
      .filter((i) => i.quantity > 0)
      .map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        reason: i.reason.trim() || undefined,
      }));
    if (valid.length === 0) {
      setReturnError('Select items to return');
      return;
    }
    setReturnError(null);
    returnMut.mutate(valid);
  }

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
      <Header back title="Order" subtitle={order?.orderNumber ?? id?.slice(-8)} />
      {q.isLoading || !order ? (
        <DetailPageSkeleton itemRows={4} />
      ) : (
        <>
          <Card className="mx-4 mt-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Subtitle>Pharmacy</Subtitle>
                <H2>{refName(order.pharmacyId)}</H2>
                <Text size="xs" tone="muted">
                  via {refName(order.distributorId)}
                </Text>
              </View>
              <Badge tone={tone[order.status] ?? 'default'}>{order.status}</Badge>
            </View>
            {canEditPending || canDeliver || canReturn ? (
              <View className="flex-row gap-2 mt-3">
                {canEditPending ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={() => router.push(`/order/${id}/edit`)}
                  >
                    Edit
                  </Button>
                ) : null}
                {canDeliver ? (
                  <Button
                    variant="success"
                    size="sm"
                    className="flex-1"
                    onPress={openDeliver}
                  >
                    Deliver
                  </Button>
                ) : null}
                {canReturn ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={openReturn}
                  >
                    Return
                  </Button>
                ) : null}
              </View>
            ) : null}
          </Card>
          <Card className="mx-4 mt-2" padded={false}>
            <View className="px-3 py-2">
              <Subtitle>Items</Subtitle>
            </View>
            <Divider />
            {order.items.map((it, i, arr) => {
              const rate = it.tpAtTime ?? 0;
              const lineGross = it.grossAmount ?? it.quantity * rate;
              const line = it.netAfterPharmacy ?? lineGross;
              const delivered = Number(it.deliveredQty) || 0;
              const returned = Number(it.returnedQty) || 0;
              return (
                <View key={it._id ?? `${String(it.productId)}-${i}`}>
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
                      {delivered > 0 || returned > 0 ? (
                        <Text size="xs" tone="muted">
                          Delivered {delivered}
                          {returned > 0 ? ` · Returned ${returned}` : ''}
                        </Text>
                      ) : null}
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
                  order.amountAfterPharmacyDiscount ?? order.totalAmount ?? 0
                ).toLocaleString()}
              </Text>
            </View>
          </Card>
          {(order.deliveries?.length ?? 0) > 0 ? (
            <Card className="mx-4 mt-2" padded={false}>
              <View className="px-3 py-2">
                <Subtitle>Deliveries</Subtitle>
              </View>
              <Divider />
              {order.deliveries!.map((delivery, i, arr) => (
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

      <OrderActionSheet
        mode="deliver"
        open={deliverOpen}
        onClose={closeDeliverSheet}
        items={deliverItems}
        onItemsChange={handleDeliverItemsChange}
        onConfirm={confirmDeliver}
        loading={deliver.isPending}
        error={deliverError}
      />

      <OrderActionSheet
        mode="return"
        open={returnOpen}
        onClose={closeReturnSheet}
        items={returnItems}
        onItemsChange={handleReturnItemsChange}
        onConfirm={confirmReturn}
        loading={returnMut.isPending}
        error={returnError}
      />
    </Screen>
  );
}
