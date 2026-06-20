/**
 * New Order (Mobile) — Web Parity Contract
 *
 *  Web reference: `pharmaERPFE/src/views/orders/CreateOrderPage.tsx`
 *  Backend route:  `POST /api/v1/orders`
 *  Backend validator: `createOrderSchema` in
 *    `pharmaERPBackend/src/validators/order.validator.js`
 *
 *  Fields submitted (must match web exactly):
 *    - pharmacyId (required, lookup)
 *    - doctorId (optional; pre-filled with first pharmacy-linked doctor; can clear)
 *    - distributorId (required, lookup)
 *    - medicalRepId (assigned rep; defaults to current user)
 *    - items[]: { productId, quantity, distributorDiscount, clinicDiscount, bonusQuantity }
 *    - notes (optional)
 *    - visitLogId (optional soft-link; not in this UI yet)
 *
 *  Pharmacy auto-applies `discountOnTP` and `bonusScheme.{buyQty,getQty}` to
 *  every line; rep can override per-line. Bonus auto-recalculates from scheme
 *  when paid qty changes unless rep edits the bonus field manually.
 */
import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Pill, X } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card, PressableCard } from '@/ui/Card';
import { Text, H2, Subtitle, Label } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { SearchField } from '@/ui/SearchField';
import { NumberStepper } from '@/ui/NumberStepper';
import { ListRow, Divider } from '@/ui/ListRow';
import { Badge } from '@/ui/Badge';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { useToast } from '@/ui/Toast';
import { masterQueries } from '@/data/masterQueries';
import { distributorsApi } from '@/api/products';
import { ordersApi, type NewOrderLineInput } from '@/api/orders';
import { ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { localEntities } from '@/data/localEntities';
import { flushOutbox } from '@/data/syncEngine';
import { useAuthStore } from '@/state/authStore';
import { PermissionGate } from '@/auth/PermissionGate';
import type { Distributor, Doctor, Pharmacy, Product } from '@/domain/types';

type Step = 'parties' | 'items' | 'review';

/**
 * Internal draft mirrors web `OrderItemForm`. `manualBonus` is UI-only and
 * never sent to the server (stripped in `toServerLines`).
 */
interface LineDraft {
  productId: string;
  productName: string;
  rateEstimate: number;
  quantity: number;
  distributorDiscount: number;
  clinicDiscount: number;
  bonusQuantity: number;
  /** True once the rep edits the bonus field manually; auto-recalc is then disabled. */
  manualBonus: boolean;
}

/** Mirrors backend `calculateBonus` (`pharmaERPBackend/src/utils/bonus.js`). */
function calculateBonus(qty: number, buyQty: number, getQty: number): number {
  if (!buyQty || !getQty || qty <= 0) return 0;
  return Math.floor(qty / buyQty) * getQty;
}

function NewOrderImpl() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);

  const [step, setStep] = React.useState<Step>('parties');
  const [pharmacy, setPharmacy] = React.useState<Pharmacy | null>(null);
  const [distributor, setDistributor] = React.useState<Distributor | null>(null);
  const [doctor, setDoctor] = React.useState<Doctor | null>(null);
  const [lines, setLines] = React.useState<Record<string, LineDraft>>({});
  const [notes, setNotes] = React.useState('');
  const [pharmacyQ, setPharmacyQ] = React.useState('');
  const [productsQ, setProductsQ] = React.useState('');
  /**
   * Free-text doctor search query. Web behavior (see `CreateOrderPage.tsx`
   * helper text): the dropdown defaults to pharmacy-linked doctors, but the
   * rep can search ALL doctors. When this is empty we show the pharmacy
   * list; when non-empty we show search results across every doctor.
   */
  const [doctorQ, setDoctorQ] = React.useState('');

  const pharmacies = useQuery({
    queryKey: ['pharmacies', 'lookup', pharmacyQ],
    enabled: step === 'parties' && pharmacyQ.trim().length >= 1,
    queryFn: () => masterQueries.pharmaciesLookup(pharmacyQ.trim()),
  });

  const distributors = useQuery({
    queryKey: ['distributors', 'lookup'],
    enabled: step === 'parties' && !!pharmacy,
    queryFn: () => masterQueries.distributorsLookup(''),
  });

  /**
   * Pharmacy-linked doctors — exactly the call the web's `CreateOrderPage`
   * makes (`doctorsService.lookup({ pharmacyId, limit: 100, isActive: 'true' })`).
   * Filtering happens server-side; we then sort by name like web does.
   * Used to auto-pick a default doctor when the pharmacy has one linked.
   */
  const pharmacyDoctors = useQuery({
    queryKey: ['doctors', 'lookup', 'pharmacy', pharmacy?._id],
    enabled: !!pharmacy?._id,
    queryFn: async () => {
      const list = await masterQueries.doctorsLookup({
        pharmacyId: pharmacy!._id,
        limit: 100,
        isActive: 'true',
      });
      return [...list].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' })
      );
    },
  });

  /**
   * "Search all doctors" — matches web's autocomplete behavior. When the rep
   * types in the doctor search field, we drop the pharmacy filter and search
   * across every doctor (still active). Disabled until they actually type.
   */
  const doctorSearch = useQuery({
    queryKey: ['doctors', 'lookup', 'search', doctorQ.trim()],
    enabled: !!pharmacy && doctorQ.trim().length >= 1,
    queryFn: () =>
      masterQueries.doctorsLookup({
        search: doctorQ.trim(),
        limit: 25,
        isActive: 'true',
      }),
  });

  /**
   * Auto-pick the first pharmacy-linked doctor as default — mirrors web's
   * `pharmacyDoctorGateRef='initial'` logic. If the current selection is
   * still in the new pharmacy's list, keep it; otherwise replace with the
   * first entry. If the pharmacy has NO linked doctors we leave the field
   * empty (rep can search and pick any doctor, or submit with none).
   */
  React.useEffect(() => {
    if (!pharmacy) {
      setDoctor(null);
      return;
    }
    if (pharmacyDoctors.isLoading) return;
    const list = pharmacyDoctors.data ?? [];
    setDoctor((prev) => {
      if (prev && list.some((d) => d._id === prev._id)) return prev;
      if (list.length > 0) return list[0];
      return prev; // pharmacy has none linked → keep whatever the rep chose
    });
  }, [pharmacy, pharmacyDoctors.data, pharmacyDoctors.isLoading]);

  const productsList = useQuery({
    queryKey: ['products', 'list'],
    enabled: step !== 'parties',
    queryFn: () => masterQueries.productsList(),
  });

  const filteredProducts = React.useMemo(() => {
    const q = productsQ.trim().toLowerCase();
    const list = productsList.data ?? [];
    if (!q) return list;
    return list.filter((p) =>
      [p.name, p.sku, p.category].filter(Boolean).some((s) => s!.toLowerCase().includes(q))
    );
  }, [productsList.data, productsQ]);

  const defaultDistributorDiscount = distributor?.discountOnTP ?? 0;
  const defaultClinicDiscount = pharmacy?.discountOnTP ?? 0;
  const bonusScheme = pharmacy?.bonusScheme ?? { buyQty: 0, getQty: 0 };

  /**
   * When pharmacy or distributor changes, re-apply scheme defaults to every
   * line that hasn't been manually overridden — mirrors web behavior.
   */
  React.useEffect(() => {
    if (!pharmacy || !distributor) return;
    setLines((prev) => {
      const next: Record<string, LineDraft> = {};
      Object.entries(prev).forEach(([id, l]) => {
        next[id] = {
          ...l,
          distributorDiscount: defaultDistributorDiscount,
          clinicDiscount: defaultClinicDiscount,
          manualBonus: false,
          bonusQuantity: calculateBonus(l.quantity, bonusScheme.buyQty, bonusScheme.getQty),
        };
      });
      return next;
    });
    // We intentionally depend on the resolved numbers, not the whole object.
  }, [
    pharmacy?._id,
    distributor?._id,
    defaultDistributorDiscount,
    defaultClinicDiscount,
    bonusScheme.buyQty,
    bonusScheme.getQty,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  function setLineField(p: Product, field: keyof LineDraft, value: number | boolean) {
    setLines((prev) => {
      const existing: LineDraft =
        prev[p._id] ?? {
          productId: p._id,
          productName: p.name,
          rateEstimate: p.tp ?? p.ptr ?? p.mrp ?? 0,
          quantity: 0,
          distributorDiscount: defaultDistributorDiscount,
          clinicDiscount: defaultClinicDiscount,
          bonusQuantity: 0,
          manualBonus: false,
        };
      let next: LineDraft = { ...existing, [field]: value } as LineDraft;
      if (field === 'quantity') {
        if (!existing.manualBonus) {
          next.bonusQuantity = calculateBonus(
            Number(value) || 0,
            bonusScheme.buyQty,
            bonusScheme.getQty
          );
        }
      } else if (field === 'bonusQuantity') {
        next.manualBonus = true;
      }
      if (next.quantity <= 0) {
        const rest = { ...prev };
        delete rest[p._id];
        return rest;
      }
      return { ...prev, [p._id]: next };
    });
  }

  function toServerLines(): NewOrderLineInput[] {
    return Object.values(lines).map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      distributorDiscount: l.distributorDiscount,
      clinicDiscount: l.clinicDiscount,
      bonusQuantity: l.bonusQuantity,
    }));
  }

  const totals = React.useMemo(() => {
    let grossTp = 0;
    let pharmacyDiscount = 0;
    let bonusUnits = 0;
    Object.values(lines).forEach((l) => {
      const lineTp = l.quantity * l.rateEstimate;
      grossTp += lineTp;
      pharmacyDiscount += lineTp * ((l.clinicDiscount || 0) / 100);
      bonusUnits += l.bonusQuantity;
    });
    return {
      grossTp,
      pharmacyDiscount,
      netPharmacy: grossTp - pharmacyDiscount,
      bonusUnits,
    };
  }, [lines]);

  function buildPayload() {
    return {
      pharmacyId: pharmacy!._id,
      doctorId: doctor?._id ?? null,
      distributorId: distributor!._id,
      medicalRepId: me?._id,
      items: toServerLines(),
      notes: notes.trim() || undefined,
    };
  }

  const create = useMutation({
    mutationFn: () => ordersApi.create({ ...buildPayload(), clientUuid: uuidv4() }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Order submitted' });
      qc.invalidateQueries({ queryKey: ['orders', 'list'] });
      router.replace('/(tabs)/orders');
    },
    onError: async (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr && (apiErr.status >= 500 || apiErr.status === 0)) {
        const clientUuid = uuidv4();
        const payload = buildPayload();
        await outbox.enqueueCore({
          feature: 'order',
          action: 'create',
          method: 'POST',
          path: '/orders',
          body: payload,
          clientUuid,
        });
        const totalAmount = Object.values(lines).reduce(
          (sum, line) => sum + line.rateEstimate * line.quantity,
          0
        );
        await localEntities.upsert({
          clientUuid,
          feature: 'order',
          entityType: 'order',
          display: {
            _id: `local:${clientUuid}`,
            clientUuid,
            status: 'PENDING',
            pharmacyId: pharmacy ? { _id: pharmacy._id, name: pharmacy.name } : null,
            distributorId: distributor ? { _id: distributor._id, name: distributor.name } : null,
            amountAfterPharmacyDiscount: totalAmount,
            totalAmount,
            createdAt: new Date().toISOString(),
            notes: notes.trim() || undefined,
          },
        });
        toast.show({ tone: 'info', message: 'Saved offline. Will sync.' });
        await flushOutbox();
        router.replace('/(tabs)/orders');
        return;
      }
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not submit' });
    },
  });

  return (
    <View className="flex-1 bg-background">
      <Header
        back
        title="New order"
        subtitle={`Step ${step === 'parties' ? '1' : step === 'items' ? '2' : '3'} of 3`}
      />

      {step === 'parties' ? (
        <Screen padded={false} scroll={false} edges={['bottom']}>
          <Card className="mx-4 mt-1">
            <Label>Pharmacy</Label>
            {pharmacy ? (
              <View className="flex-row items-center justify-between mt-1">
                <View>
                  <Text size="base" weight="semibold">
                    {pharmacy.name}
                  </Text>
                  <Subtitle>{pharmacy.city ?? ''}</Subtitle>
                </View>
                <Button variant="ghost" size="sm" onPress={() => setPharmacy(null)}>
                  Change
                </Button>
              </View>
            ) : (
              <SearchField
                value={pharmacyQ}
                onChangeText={setPharmacyQ}
                placeholder="Search pharmacy by name"
              />
            )}
          </Card>

          {pharmacy ? (
            <Card className="mx-4 mt-2">
              <Label>Doctor (optional)</Label>
              <Subtitle className="mb-2">
                Default picks the first doctor linked to this pharmacy. Search to
                pick any doctor, or leave empty to submit without a doctor.
              </Subtitle>

              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1 pr-2">
                  <Text size="base" weight="semibold" numberOfLines={1}>
                    {doctor ? doctor.name : 'No doctor (skip)'}
                  </Text>
                  <Subtitle numberOfLines={1}>
                    {doctor?.specialization ??
                      'This order will not be attributed to a doctor.'}
                  </Subtitle>
                </View>
                {doctor ? (
                  <Button variant="ghost" size="sm" onPress={() => setDoctor(null)}>
                    Clear
                  </Button>
                ) : null}
              </View>

              <SearchField
                value={doctorQ}
                onChangeText={setDoctorQ}
                placeholder="Search name, specialty, brick, code, city…"
              />

              {doctorQ.trim().length >= 1 ? (
                doctorSearch.isLoading ? (
                  <View className="mt-2">
                    <ListSkeletonList count={2} variant="avatar" className="px-0 pt-2" />
                  </View>
                ) : (doctorSearch.data ?? []).length === 0 ? (
                  <Text size="sm" tone="muted" className="mt-2">
                    No doctors match “{doctorQ.trim()}”.
                  </Text>
                ) : (
                  <View className="mt-2">
                    {(doctorSearch.data ?? []).slice(0, 8).map((d) => (
                      <ListRow
                        key={d._id}
                        title={d.name}
                        subtitle={d.specialization ?? '—'}
                        onPress={() => {
                          setDoctor(d);
                          setDoctorQ('');
                        }}
                        right={
                          doctor?._id === d._id ? (
                            <Badge tone="primary">Selected</Badge>
                          ) : null
                        }
                      />
                    ))}
                  </View>
                )
              ) : pharmacyDoctors.isLoading ? (
                <ListSkeletonList count={2} variant="avatar" className="px-0 pt-2" />
              ) : (pharmacyDoctors.data ?? []).length === 0 ? (
                <Text size="sm" tone="muted" className="mt-2">
                  No doctors are linked to this pharmacy yet. Use the search above
                  to attach any doctor, or leave empty.
                </Text>
              ) : (
                <View className="mt-2">
                  <Text size="xs" tone="muted" className="mb-1">
                    Linked to this pharmacy
                  </Text>
                  {(pharmacyDoctors.data ?? []).slice(0, 5).map((d) => (
                    <ListRow
                      key={d._id}
                      title={d.name}
                      subtitle={d.specialization ?? '—'}
                      onPress={() => setDoctor(d)}
                      right={
                        doctor?._id === d._id ? (
                          <Badge tone="primary">Selected</Badge>
                        ) : null
                      }
                    />
                  ))}
                </View>
              )}
            </Card>
          ) : null}

          {pharmacy ? (
            <Card className="mx-4 mt-2">
              <Label>Distributor</Label>
              {distributor ? (
                <View className="flex-row items-center justify-between mt-1">
                  <Text size="base" weight="semibold">
                    {distributor.name}
                  </Text>
                  <Button variant="ghost" size="sm" onPress={() => setDistributor(null)}>
                    Change
                  </Button>
                </View>
              ) : distributors.isLoading ? (
                <ListSkeletonList count={2} variant="split" className="px-0 pt-2" />
              ) : (
                <View>
                  {(distributors.data ?? []).slice(0, 8).map((d, i) => (
                    <View key={d._id}>
                      <ListRow title={d.name} onPress={() => setDistributor(d)} />
                      {i < (distributors.data?.length ?? 0) - 1 ? <Divider /> : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ) : pharmacies.isLoading ? (
            <View className="px-4 mt-2">
              <ListSkeletonList count={4} variant="split" className="px-4 mt-2" />
            </View>
          ) : (pharmacies.data ?? []).length === 0 ? null : (
            <FlatList
              data={pharmacies.data!}
              keyExtractor={(p) => p._id}
              contentContainerClassName="px-4 pt-2 pb-32"
              ItemSeparatorComponent={() => <View className="h-2" />}
              renderItem={({ item }) => (
                <PressableCard onPress={() => setPharmacy(item)}>
                  <Text size="base" weight="semibold">
                    {item.name}
                  </Text>
                  <Subtitle>{item.city ?? ''}</Subtitle>
                </PressableCard>
              )}
            />
          )}

          {pharmacy && distributor ? (
            <Card className="mx-4 mt-2">
              <Label>Scheme summary</Label>
              <Text size="sm" tone="muted" className="mt-1">
                Distributor disc. {defaultDistributorDiscount}% · Pharmacy disc.{' '}
                {defaultClinicDiscount}%
              </Text>
              <Text size="sm" tone="muted">
                Bonus scheme: Buy {bonusScheme.buyQty} get {bonusScheme.getQty}
              </Text>
            </Card>
          ) : null}

          <StickyActionBar>
            <Button
              fullWidth
              onPress={() => setStep('items')}
              disabled={!pharmacy || !distributor}
            >
              Next: Products
            </Button>
          </StickyActionBar>
        </Screen>
      ) : null}

      {step === 'items' ? (
        <Screen padded={false} scroll={false} edges={['bottom']}>
          <View className="px-4 pb-2">
            <SearchField
              value={productsQ}
              onChangeText={setProductsQ}
              placeholder="Search products"
            />
          </View>
          {productsList.isLoading ? (
            <View className="px-4">
              <ListSkeletonList count={6} variant="split" className="px-4" />
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(p) => p._id}
              contentContainerClassName="px-4 pb-32"
              ItemSeparatorComponent={() => <View className="h-2" />}
              renderItem={({ item }) => {
                const line = lines[item._id];
                return (
                  <Card>
                    <View className="flex-row items-center">
                      <View className="h-10 w-10 rounded-lg bg-primary-50 items-center justify-center mr-2">
                        <Pill size={18} color="#2563eb" />
                      </View>
                      <View className="flex-1">
                        <Text size="base" weight="semibold" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Subtitle numberOfLines={1}>
                          {[item.packSize, item.sku].filter(Boolean).join(' · ')}
                        </Subtitle>
                        <Text size="xs" tone="muted">
                          TP Rs {item.tp ?? item.ptr ?? item.mrp ?? 0}
                        </Text>
                      </View>
                      <NumberStepper
                        value={line?.quantity ?? 0}
                        onChange={(v) => setLineField(item, 'quantity', v)}
                        min={0}
                        max={9999}
                      />
                    </View>
                    {line ? (
                      <View className="flex-row items-center mt-2">
                        <TextField
                          label="Dist. disc %"
                          keyboardType="numeric"
                          value={String(line.distributorDiscount)}
                          onChangeText={(t) =>
                            setLineField(
                              item,
                              'distributorDiscount',
                              Math.min(100, Math.max(0, Number(t) || 0))
                            )
                          }
                          containerClassName="flex-1 mr-2 mb-0"
                        />
                        <TextField
                          label="Pharm disc %"
                          keyboardType="numeric"
                          value={String(line.clinicDiscount)}
                          onChangeText={(t) =>
                            setLineField(
                              item,
                              'clinicDiscount',
                              Math.min(100, Math.max(0, Number(t) || 0))
                            )
                          }
                          containerClassName="flex-1 mr-2 mb-0"
                        />
                        <TextField
                          label="Bonus"
                          keyboardType="numeric"
                          value={String(line.bonusQuantity)}
                          onChangeText={(t) =>
                            setLineField(item, 'bonusQuantity', Math.max(0, Number(t) || 0))
                          }
                          containerClassName="flex-1 mb-0"
                        />
                      </View>
                    ) : null}
                  </Card>
                );
              }}
            />
          )}
          <StickyActionBar>
            <View className="flex-row items-center justify-between mb-2">
              <Text size="sm" tone="muted">
                {Object.keys(lines).length} items · Bonus {totals.bonusUnits}
              </Text>
              <Text size="base" weight="semibold">
                Rs {Math.round(totals.netPharmacy).toLocaleString()}
              </Text>
            </View>
            <Button
              fullWidth
              onPress={() => setStep('review')}
              disabled={Object.keys(lines).length === 0}
            >
              Review order
            </Button>
          </StickyActionBar>
        </Screen>
      ) : null}

      {step === 'review' ? (
        <Screen padded={false} edges={['bottom']}>
          <Card className="mx-4 mt-2">
            <Label>Parties</Label>
            <Text size="base" weight="semibold" className="mt-1">
              {pharmacy?.name}
            </Text>
            <Subtitle>via {distributor?.name}</Subtitle>
            <Text size="sm" tone={doctor ? 'default' : 'muted'} className="mt-1">
              Doctor: {doctor?.name ?? 'No doctor'}
            </Text>
            <Text size="xs" tone="muted">
              Assigned rep: {me?.name ?? 'Me'}
            </Text>
          </Card>

          <Card className="mx-4 mt-2" padded={false}>
            <View className="px-3 py-2">
              <Subtitle>Items</Subtitle>
            </View>
            <Divider />
            {Object.values(lines).map((l, i, arr) => (
              <View key={l.productId}>
                <View className="px-3 py-3 flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text size="sm" weight="medium" numberOfLines={1}>
                      {l.productName}
                    </Text>
                    <Subtitle>
                      {l.quantity} × Rs {l.rateEstimate}{' '}
                      {l.distributorDiscount ? `· dist -${l.distributorDiscount}%` : ''}{' '}
                      {l.clinicDiscount ? `· phar -${l.clinicDiscount}%` : ''}{' '}
                      {l.bonusQuantity ? `+${l.bonusQuantity} bonus` : ''}
                    </Subtitle>
                  </View>
                  <Text size="sm" weight="semibold">
                    Rs{' '}
                    {Math.round(
                      l.quantity * l.rateEstimate * (1 - (l.clinicDiscount || 0) / 100)
                    ).toLocaleString()}
                  </Text>
                </View>
                {i < arr.length - 1 ? <Divider /> : null}
              </View>
            ))}
            <Divider />
            <View className="px-3 py-3 flex-row items-center justify-between">
              <Text size="sm" tone="muted">
                Gross (TP)
              </Text>
              <Text size="sm">Rs {Math.round(totals.grossTp).toLocaleString()}</Text>
            </View>
            <View className="px-3 pb-3 flex-row items-center justify-between">
              <Text size="sm" tone="muted">
                Pharmacy discount
              </Text>
              <Text size="sm">- Rs {Math.round(totals.pharmacyDiscount).toLocaleString()}</Text>
            </View>
            <Divider />
            <View className="px-3 py-3 flex-row items-center justify-between">
              <Text size="base" weight="semibold">
                Net pharmacy
              </Text>
              <Text size="base" weight="bold">
                Rs {Math.round(totals.netPharmacy).toLocaleString()}
              </Text>
            </View>
          </Card>

          <Card className="mx-4 mt-2">
            <TextField
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything special?"
              multiline
              numberOfLines={3}
            />
          </Card>

          <StickyActionBar>
            <View className="flex-row">
              <Button
                variant="outline"
                onPress={() => setStep('items')}
                className="flex-1 mr-2"
                leftIcon={<X size={16} color="#0f172a" />}
              >
                Back
              </Button>
              <Button
                onPress={() => create.mutate()}
                loading={create.isPending}
                className="flex-1"
              >
                Submit order
              </Button>
            </View>
          </StickyActionBar>
        </Screen>
      ) : null}
    </View>
  );
}

export default function NewOrder() {
  return (
    <PermissionGate screen="order_new" title="New order">
      <NewOrderImpl />
    </PermissionGate>
  );
}
