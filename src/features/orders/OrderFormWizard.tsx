/**
 * Shared order create / edit wizard (Mobile) — Web Parity Contract
 *
 *  Create: `pharmaERPFE/src/views/orders/CreateOrderPage.tsx`
 *  Edit:   `pharmaERPFE/src/views/orders/EditOrderPage.tsx` (PENDING only)
 */
import * as React from 'react';
import { View, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Pill, X } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card, PressableCard } from '@/ui/Card';
import { Text, Subtitle, Label } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { SearchField } from '@/ui/SearchField';
import { NumberStepper } from '@/ui/NumberStepper';
import { ListRow, Divider } from '@/ui/ListRow';
import { Badge } from '@/ui/Badge';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { FormFieldsCardSkeleton, ListSkeletonList } from '@/ui/listCardSkeletons';
import { useToast } from '@/ui/Toast';
import { masterQueries } from '@/data/masterQueries';
import { ordersApi, type NewOrderLineInput } from '@/api/orders';
import { ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { localEntities } from '@/data/localEntities';
import { flushOutbox } from '@/data/syncEngine';
import { useAuthStore } from '@/state/authStore';
import type { Distributor, Doctor, Pharmacy, Product } from '@/domain/types';
import {
  calculateBonus,
  linesFromOrderItems,
  mergeCatalogWithLines,
  orderTotals,
  refId,
  type LineDraft,
} from '@/features/orders/orderFormUtils';

type Step = 'parties' | 'items' | 'review';

export type OrderFormMode = 'create' | 'edit';

interface OrderFormWizardProps {
  mode: OrderFormMode;
  orderId?: string;
}

export function OrderFormWizard({ mode, orderId }: OrderFormWizardProps) {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isEdit = mode === 'edit';
  const pharmacyDoctorGateRef = React.useRef<'initial' | 'ready'>(isEdit ? 'ready' : 'initial');
  const prevPartiesRef = React.useRef({ ph: '', dist: '' });

  const [step, setStep] = React.useState<Step>('parties');
  const [hydrated, setHydrated] = React.useState(!isEdit);
  const [pharmacy, setPharmacy] = React.useState<Pharmacy | null>(null);
  const [distributor, setDistributor] = React.useState<Distributor | null>(null);
  const [doctor, setDoctor] = React.useState<Doctor | null>(null);
  const [medicalRepId, setMedicalRepId] = React.useState<string | undefined>(me?._id);
  const [lines, setLines] = React.useState<Record<string, LineDraft>>({});
  const [notes, setNotes] = React.useState('');
  const [pharmacyQ, setPharmacyQ] = React.useState('');
  const [productsQ, setProductsQ] = React.useState('');
  const [doctorQ, setDoctorQ] = React.useState('');

  const orderQuery = useQuery({
    queryKey: ['order', orderId, 'edit'],
    enabled: isEdit && !!orderId,
    queryFn: () => ordersApi.getById(orderId!),
  });

  React.useEffect(() => {
    if (!isEdit || !orderQuery.data || hydrated) return;
    const order = orderQuery.data;
    if (order.status !== 'PENDING') {
      toast.show({ tone: 'danger', message: 'Only pending orders can be edited' });
      router.back();
      return;
    }

    const phRaw = order.pharmacyId;
    const phId = refId(phRaw as string | { _id?: string });
    const phObj = phRaw && typeof phRaw === 'object' ? phRaw : null;
    const loadedPharmacy: Pharmacy = {
      _id: phId,
      name: phObj && 'name' in phObj ? String(phObj.name) : 'Pharmacy',
      city: phObj && 'city' in phObj ? String(phObj.city ?? '') : undefined,
      discountOnTP: phObj && 'discountOnTP' in phObj ? Number(phObj.discountOnTP) : undefined,
      bonusScheme:
        phObj && 'bonusScheme' in phObj
          ? (phObj.bonusScheme as Pharmacy['bonusScheme'])
          : undefined,
    };

    const distRaw = order.distributorId;
    const distId = refId(distRaw as string | { _id?: string });
    const distObj = distRaw && typeof distRaw === 'object' ? distRaw : null;
    const loadedDistributor: Distributor = {
      _id: distId,
      name: distObj && 'name' in distObj ? String(distObj.name) : 'Distributor',
      discountOnTP:
        distObj && 'discountOnTP' in distObj ? Number(distObj.discountOnTP) : undefined,
    };

    const docRaw = order.doctorId;
    const docId = refId(docRaw as string | { _id?: string });
    const docObj = docRaw && typeof docRaw === 'object' ? docRaw : null;
    const loadedDoctor: Doctor | null = docId
      ? {
          _id: docId,
          name: docObj && 'name' in docObj ? String(docObj.name) : 'Doctor',
          specialization:
            docObj && 'specialization' in docObj
              ? String(docObj.specialization ?? '')
              : undefined,
        }
      : null;

    const schemeBuy = loadedPharmacy.bonusScheme?.buyQty ?? 0;
    const schemeGet = loadedPharmacy.bonusScheme?.getQty ?? 0;

    prevPartiesRef.current = { ph: phId, dist: distId };
    setPharmacy(loadedPharmacy);
    setDistributor(loadedDistributor);
    setDoctor(loadedDoctor);
    setMedicalRepId(refId(order.medicalRepId as string | { _id?: string }) || me?._id);
    setNotes(order.notes ?? '');
    setLines(linesFromOrderItems(order.items, schemeBuy, schemeGet));
    setHydrated(true);
  }, [isEdit, orderQuery.data, hydrated, me?._id, router, toast]);

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
   * Default doctor from pharmacy-linked list; on edit the loaded doctor is kept
   * until the user changes pharmacy (web `pharmacyDoctorGateRef` parity).
   */
  React.useEffect(() => {
    if (!pharmacy) {
      setDoctor(null);
      return;
    }
    if (pharmacyDoctors.isLoading) return;
    const list = pharmacyDoctors.data ?? [];
    setDoctor((prev) => {
      const ids = new Set(list.map((d) => d._id));
      const prevId = prev?._id ?? '';
      if (pharmacyDoctorGateRef.current === 'initial') {
        pharmacyDoctorGateRef.current = 'ready';
        if (prevId && ids.has(prevId)) return prev;
        if (prevId) return prev;
        return list[0] ?? null;
      }
      if (prevId && ids.has(prevId)) return prev;
      return list[0] ?? null;
    });
  }, [pharmacy, pharmacyDoctors.data, pharmacyDoctors.isLoading]);

  const productsList = useQuery({
    queryKey: ['products', 'list'],
    enabled: step !== 'parties',
    queryFn: () => masterQueries.productsList(),
  });

  const catalogProducts = React.useMemo(
    () => mergeCatalogWithLines(productsList.data ?? [], lines),
    [productsList.data, lines]
  );

  const filteredProducts = React.useMemo(() => {
    const q = productsQ.trim().toLowerCase();
    if (!q) return catalogProducts;
    return catalogProducts.filter((p) =>
      [p.name, p.sku, p.category].filter(Boolean).some((s) => s!.toLowerCase().includes(q))
    );
  }, [catalogProducts, productsQ]);

  const defaultDistributorDiscount = distributor?.discountOnTP ?? 0;
  const defaultClinicDiscount = pharmacy?.discountOnTP ?? 0;
  const bonusScheme = pharmacy?.bonusScheme ?? { buyQty: 0, getQty: 0 };

  /**
   * Re-apply scheme defaults when pharmacy or distributor changes after initial
   * load — mirrors web `applyDiscountsForPharmacyAndDistributor`.
   */
  React.useEffect(() => {
    if (!hydrated || !pharmacy || !distributor) return;
    const ph = pharmacy._id;
    const dist = distributor._id;
    if (prevPartiesRef.current.ph === ph && prevPartiesRef.current.dist === dist) return;
    prevPartiesRef.current = { ph, dist };
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
  }, [
    hydrated,
    pharmacy?._id,
    distributor?._id,
    defaultDistributorDiscount,
    defaultClinicDiscount,
    bonusScheme.buyQty,
    bonusScheme.getQty,
  ]);

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

  const totals = React.useMemo(() => orderTotals(lines), [lines]);

  function buildPayload() {
    return {
      pharmacyId: pharmacy!._id,
      doctorId: doctor?._id ?? null,
      distributorId: distributor!._id,
      medicalRepId: medicalRepId ?? me?._id,
      items: toServerLines(),
      notes: notes.trim() || undefined,
    };
  }

  const submit = useMutation({
    mutationFn: () =>
      isEdit
        ? ordersApi.update(orderId!, buildPayload())
        : ordersApi.create({ ...buildPayload(), clientUuid: uuidv4() }),
    onSuccess: () => {
      toast.show({
        tone: 'success',
        message: isEdit ? 'Order updated' : 'Order submitted',
      });
      qc.invalidateQueries({ queryKey: ['orders', 'list'] });
      if (isEdit && orderId) {
        qc.invalidateQueries({ queryKey: ['order', orderId] });
        router.replace(`/order/${orderId}`);
        return;
      }
      router.replace('/(tabs)/orders');
    },
    onError: async (err: unknown) => {
      if (!isEdit) {
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
      }
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? (isEdit ? 'Could not update' : 'Could not submit') });
    },
  });

  if (isEdit && (orderQuery.isLoading || !hydrated)) {
    return (
      <View className="flex-1 bg-background">
        <Header back title="Edit order" subtitle="Loading…" />
        <FormFieldsCardSkeleton fields={4} className="mx-4 mt-4" />
      </View>
    );
  }

  if (isEdit && orderQuery.isError) {
    return (
      <View className="flex-1 bg-background">
        <Header back title="Edit order" />
        <Card className="mx-4 mt-4">
          <Text tone="danger">Could not load order.</Text>
          <Button variant="outline" className="mt-3" onPress={() => router.back()}>
            Go back
          </Button>
        </Card>
      </View>
    );
  }

  const headerTitle = isEdit ? 'Edit order' : 'New order';
  const submitLabel = isEdit ? 'Save changes' : 'Submit order';

  return (
    <View className="flex-1 bg-background">
      <Header
        back
        title={headerTitle}
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
                <Button variant="ghost" size="sm" onPress={() => {
                  pharmacyDoctorGateRef.current = 'initial';
                  setPharmacy(null);
                }}>
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
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          className="h-10 w-10 rounded-lg bg-muted mr-2"
                          contentFit="cover"
                        />
                      ) : (
                        <View className="h-10 w-10 rounded-lg bg-primary-50 items-center justify-center mr-2">
                          <Pill size={18} color="#2563eb" />
                        </View>
                      )}
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
                onPress={() => submit.mutate()}
                loading={submit.isPending}
                className="flex-1"
              >
                {submitLabel}
              </Button>
            </View>
          </StickyActionBar>
        </Screen>
      ) : null}
    </View>
  );
}
