import * as React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { SearchField } from '@/ui/SearchField';
import { Button } from '@/ui/Button';
import { pharmaciesApi } from '@/api/pharmacies';
import { usersApi, type AssignableUser } from '@/api/users';
import type { ID, Pharmacy } from '@/domain/types';
import { cn } from '@/utils/cn';

export type OrderStatusFilter =
  | ''
  | 'ALL'
  | 'PENDING'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'RETURNS'
  | 'PARTIALLY_RETURNED'
  | 'RETURNED'
  | 'CANCELLED';

export interface OrderListFilters {
  status: OrderStatusFilter;
  pharmacyId?: ID;
  pharmacyName?: string;
  medicalRepId?: ID;
  medicalRepName?: string;
}

export const emptyOrderFilters: OrderListFilters = { status: '' };

const STATUS_OPTIONS: { value: OrderStatusFilter; label: string }[] = [
  { value: '', label: 'Active (hide cancelled)' },
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_DELIVERED', label: 'Partially delivered' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURNS', label: 'Returns' },
  { value: 'PARTIALLY_RETURNED', label: 'Partially returned' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface OrdersFilterSheetProps {
  open: boolean;
  onClose: () => void;
  value: OrderListFilters;
  onApply: (next: OrderListFilters) => void;
  canFilterByRep: boolean;
}

export const OrdersFilterSheet: React.FC<OrdersFilterSheetProps> = ({
  open,
  onClose,
  value,
  onApply,
  canFilterByRep,
}) => {
  const [draft, setDraft] = React.useState<OrderListFilters>(value);
  const [pharmacySearch, setPharmacySearch] = React.useState('');
  const [pharmacyHits, setPharmacyHits] = React.useState<Pharmacy[]>([]);
  const [pharmacyLoading, setPharmacyLoading] = React.useState(false);
  const [repSearch, setRepSearch] = React.useState('');
  const [repHits, setRepHits] = React.useState<AssignableUser[]>([]);
  const [repLoading, setRepLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  React.useEffect(() => {
    if (!open) return;
    let cancel = false;
    const q = pharmacySearch.trim();
    if (q.length < 2) {
      setPharmacyHits([]);
      return;
    }
    setPharmacyLoading(true);
    void pharmaciesApi
      .lookup(q, 15)
      .then((rows) => {
        if (!cancel) setPharmacyHits(rows);
      })
      .finally(() => {
        if (!cancel) setPharmacyLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [open, pharmacySearch]);

  React.useEffect(() => {
    if (!open || !canFilterByRep) return;
    let cancel = false;
    const q = repSearch.trim();
    if (q.length < 2) {
      setRepHits([]);
      return;
    }
    setRepLoading(true);
    void usersApi
      .assignable(q, 15, 'team')
      .then((rows) => {
        if (!cancel) setRepHits(rows);
      })
      .finally(() => {
        if (!cancel) setRepLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [open, repSearch, canFilterByRep]);

  const footer = (
    <View className="flex-row gap-2">
      <Button
        variant="outline"
        className="flex-1"
        onPress={() => {
          setDraft(emptyOrderFilters);
          setPharmacySearch('');
          setRepSearch('');
          onApply(emptyOrderFilters);
          onClose();
        }}
      >
        Reset
      </Button>
      <Button
        className="flex-1"
        onPress={() => {
          onApply(draft);
          onClose();
        }}
      >
        Apply
      </Button>
    </View>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter orders"
      subtitle="Status, pharmacy, and rep (managers only)"
      snapPoints={['50%', '85%']}
      initialSnapIndex={-1}
      scrollable
      footer={footer}
    >
      <Text size="xs" weight="semibold" tone="muted" className="mb-2 uppercase tracking-wide">
        Status
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {STATUS_OPTIONS.map((opt) => {
          const active = draft.status === opt.value;
          return (
            <Pressable
              key={opt.value || 'default'}
              onPress={() => setDraft((d) => ({ ...d, status: opt.value }))}
              className={cn(
                'rounded-full px-3 py-1.5 border',
                active ? 'bg-primary border-primary' : 'bg-muted border-border',
              )}
            >
              <Text size="xs" className={active ? 'text-white' : undefined}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text size="xs" weight="semibold" tone="muted" className="mb-2 uppercase tracking-wide">
        Pharmacy
      </Text>
      {draft.pharmacyId ? (
        <View className="flex-row items-center justify-between rounded-xl border border-border bg-muted px-3 py-2 mb-2">
          <Text size="sm" className="flex-1 pr-2" numberOfLines={1}>
            {draft.pharmacyName ?? 'Pharmacy'}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={() =>
              setDraft((d) => ({ ...d, pharmacyId: undefined, pharmacyName: undefined }))
            }
          >
            Clear
          </Button>
        </View>
      ) : null}
      <SearchField
        value={pharmacySearch}
        onChangeText={setPharmacySearch}
        placeholder="Search pharmacy name…"
      />
      {pharmacyLoading ? (
        <ActivityIndicator className="my-3" />
      ) : (
        pharmacyHits.map((p) => (
          <Pressable
            key={p._id}
            onPress={() => {
              setDraft((d) => ({ ...d, pharmacyId: p._id, pharmacyName: p.name }));
              setPharmacySearch('');
              setPharmacyHits([]);
            }}
            className="py-2 border-b border-border"
          >
            <Text size="sm" weight="medium">
              {p.name}
            </Text>
            {p.city ? (
              <Text size="xs" tone="muted">
                {p.city}
              </Text>
            ) : null}
          </Pressable>
        ))
      )}

      {canFilterByRep ? (
        <>
          <Text
            size="xs"
            weight="semibold"
            tone="muted"
            className="mb-2 mt-4 uppercase tracking-wide"
          >
            Medical rep
          </Text>
          {draft.medicalRepId ? (
            <View className="flex-row items-center justify-between rounded-xl border border-border bg-muted px-3 py-2 mb-2">
              <Text size="sm" className="flex-1 pr-2" numberOfLines={1}>
                {draft.medicalRepName ?? 'Rep'}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={() =>
                  setDraft((d) => ({ ...d, medicalRepId: undefined, medicalRepName: undefined }))
                }
              >
                Clear
              </Button>
            </View>
          ) : null}
          <SearchField
            value={repSearch}
            onChangeText={setRepSearch}
            placeholder="Search rep name or email…"
          />
          {repLoading ? (
            <ActivityIndicator className="my-3" />
          ) : (
            repHits.map((u) => (
              <Pressable
                key={u._id}
                onPress={() => {
                  setDraft((d) => ({
                    ...d,
                    medicalRepId: u._id,
                    medicalRepName: u.name,
                  }));
                  setRepSearch('');
                  setRepHits([]);
                }}
                className="py-2 border-b border-border"
              >
                <Text size="sm" weight="medium">
                  {u.name}
                </Text>
                {u.email ? (
                  <Text size="xs" tone="muted">
                    {u.email}
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </>
      ) : null}
    </Sheet>
  );
};
