import * as React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { FilterChip } from '@/ui/FilterChip';
import { FilterSelectionBar } from '@/ui/FilterSelectionBar';
import { useTheme } from '@/theme/ThemeProvider';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { SearchField } from '@/ui/SearchField';
import { Button } from '@/ui/Button';
import { pharmaciesApi } from '@/api/pharmacies';
import { usersApi, type AssignableUser } from '@/api/users';
import type { ID, Pharmacy } from '@/domain/types';

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
  const { colors } = useTheme();
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
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value || 'default'}
            label={opt.label}
            selected={draft.status === opt.value}
            onPress={() => setDraft((d) => ({ ...d, status: opt.value }))}
          />
        ))}
      </View>

      <Text size="xs" weight="semibold" tone="muted" className="mb-2 uppercase tracking-wide">
        Pharmacy
      </Text>
      {draft.pharmacyId ? (
        <FilterSelectionBar
          label={draft.pharmacyName ?? 'Pharmacy'}
          onClear={() =>
            setDraft((d) => ({ ...d, pharmacyId: undefined, pharmacyName: undefined }))
          }
        />
      ) : null}
      <SearchField
        value={pharmacySearch}
        onChangeText={setPharmacySearch}
        placeholder="Search pharmacy name…"
      />
      {pharmacyLoading ? (
        <ActivityIndicator color={colors.primary} className="my-3" />
      ) : (
        pharmacyHits.map((p) => (
          <Pressable
            key={p._id}
            onPress={() => {
              setDraft((d) => ({ ...d, pharmacyId: p._id, pharmacyName: p.name }));
              setPharmacySearch('');
              setPharmacyHits([]);
            }}
            className="py-2 border-b"
            style={{ borderBottomColor: colors.border }}
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
            <FilterSelectionBar
              label={draft.medicalRepName ?? 'Rep'}
              onClear={() =>
                setDraft((d) => ({ ...d, medicalRepId: undefined, medicalRepName: undefined }))
              }
            />
          ) : null}
          <SearchField
            value={repSearch}
            onChangeText={setRepSearch}
            placeholder="Search rep name or email…"
          />
          {repLoading ? (
            <ActivityIndicator color={colors.primary} className="my-3" />
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
                className="py-2 border-b"
                style={{ borderBottomColor: colors.border }}
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
