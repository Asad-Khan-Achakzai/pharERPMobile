/**
 * Active Visit (Mobile) — Web Parity Contract
 *
 *  Web reference: `pharmaERPFE/src/views/visits/TodayVisitsPage.tsx`
 *  Backend routes:
 *    - `POST /api/v1/plan-items/:id/mark-visit`
 *    - `POST /api/v1/visits/unplanned`
 *  Validators: `markVisitSchema`, `unplannedVisitSchema` in
 *    `pharmaERPBackend/src/validators/planItem.validator.js`
 *
 *  Submitted fields (planned):
 *    notes, orderTaken, visitTime, checkInTime, checkOutTime, location?,
 *    productsDiscussed[], primaryProductId?, samplesQty?, samplesGiven?,
 *    followUpDate?, outOfOrderReason? (required when not next-in-sequence).
 *
 *  Submitted fields (unplanned): same as planned + doctorId + unplannedReason
 *    (one of EMERGENCY | AVAILABLE_UNEXPECTEDLY | OTHER).
 */
import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';
import { intervalToDuration } from 'date-fns';
import {
  ClipboardList,
  Frown,
  Meh,
  Pill,
  ReceiptText,
  Smile,
  StickyNote,
} from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Text, H2, Subtitle } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { DatePickerField } from '@/ui/DatePickerField';
import { formatDoctorHeaderSubtitle } from '@/features/doctors/doctorDisplay';
import { useAppBack } from '@/navigation/useAppBack';
import { Switch } from '@/ui/Switch';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { Tabs } from '@/ui/Tabs';
import { ListRow, Divider } from '@/ui/ListRow';
import { Badge } from '@/ui/Badge';
import { NumberStepper } from '@/ui/NumberStepper';
import { useToast } from '@/ui/Toast';
import { AddPhotoButton } from '@/ui/media/AddPhotoButton';
import { ProductVisualViewer } from '@/ui/media/ProductVisualViewer';
import {
  planItemsApi,
  visitsApi,
  type MarkVisitInput,
  type UnplannedVisitInput,
} from '@/api/planItems';
import { doctorsApi } from '@/api/doctors';
import { productsApi } from '@/api/products';
import { ApiError } from '@/api/client';
import { useFlags } from '@/hooks/useFlags';
import { outbox } from '@/data/outbox';
import { getDb } from '@/data/db';
import type { Doctor, ID, PlanItem, Product } from '@/domain/types';
import { flushOutbox } from '@/data/syncEngine';

type Mode = 'planned' | 'unplanned';

export type UnplannedReason = 'EMERGENCY' | 'AVAILABLE_UNEXPECTEDLY' | 'OTHER';

const UNPLANNED_REASON_LABELS: Record<UnplannedReason, string> = {
  EMERGENCY: 'Emergency',
  AVAILABLE_UNEXPECTEDLY: 'Available unexpectedly',
  OTHER: 'Other',
};

interface ActiveVisitScreenProps {
  mode: Mode;
  planItem?: PlanItem;
  doctorId?: ID;
  /** `nextPlanItem._id` from `GET /plan-items/today`; used to detect out-of-sequence visits. */
  nextPendingPlanItemId?: ID | null;
}

type TabKey = 'details' | 'products' | 'samples' | 'notes' | 'wrapup';

type MoodKey = 'positive' | 'neutral' | 'negative';

const moodOptions: { key: MoodKey; icon: React.ReactNode; label: string }[] = [
  { key: 'positive', icon: <Smile size={18} color="#10b981" />, label: 'Good' },
  { key: 'neutral', icon: <Meh size={18} color="#64748b" />, label: 'Neutral' },
  { key: 'negative', icon: <Frown size={18} color="#ef4444" />, label: 'Tough' },
];

function extractDoctorId(planItem?: PlanItem): ID | undefined {
  if (!planItem?.doctorId) return undefined;
  return typeof planItem.doctorId === 'string' ? planItem.doctorId : planItem.doctorId._id;
}

function extractPlannedDoctor(
  planItem?: PlanItem
): Pick<Doctor, '_id' | 'name' | 'specialization'> | null {
  if (planItem?.doctorId && typeof planItem.doctorId === 'object') {
    return planItem.doctorId as Pick<Doctor, '_id' | 'name' | 'specialization'>;
  }
  return null;
}

export const ActiveVisitScreen: React.FC<ActiveVisitScreenProps> = ({
  mode,
  planItem,
  doctorId,
  nextPendingPlanItemId,
}) => {
  const goBack = useAppBack('/(tabs)/visits');
  const toast = useToast();
  const qc = useQueryClient();
  const flags = useFlags();
  const targetDoctorId = mode === 'planned' ? extractDoctorId(planItem) : doctorId;
  const plannedDoctor = mode === 'planned' ? extractPlannedDoctor(planItem) : null;

  /**
   * Backend `markVisit` blocks out-of-sequence visits unless an
   * `outOfOrderReason` (≥3 chars) is provided. We mirror the web check using
   * `nextPlanItem._id` from `TodayBundle`.
   */
  const isOutOfSequence =
    mode === 'planned' &&
    !!planItem?._id &&
    !!nextPendingPlanItemId &&
    String(planItem._id) !== String(nextPendingPlanItemId);

  const doctor = useQuery({
    queryKey: ['doctor', targetDoctorId],
    enabled: !!targetDoctorId,
    queryFn: () => doctorsApi.getById(targetDoctorId!),
  });

  const products = useQuery({
    queryKey: ['products', 'list'],
    queryFn: () => productsApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const [tab, setTab] = React.useState<TabKey>('details');
  const [startedAt] = React.useState(() => new Date());
  const [now, setNow] = React.useState(() => new Date());
  const [clientUuid] = React.useState(() => uuidv4());
  const [notes, setNotes] = React.useState('');
  const [mood, setMood] = React.useState<MoodKey | undefined>();
  const [selectedProducts, setSelectedProducts] = React.useState<Set<string>>(new Set());
  const [samples, setSamples] = React.useState<Record<string, number>>({});
  const [primaryProductId, setPrimaryProductId] = React.useState<ID | null>(null);
  /** Backend `orderTaken` — boolean, optional. */
  const [orderTaken, setOrderTaken] = React.useState<boolean>(false);
  /** Backend `followUpDate` — `YYYY-MM-DD` or empty. */
  const [followUpDate, setFollowUpDate] = React.useState<string>('');
  /** Backend `outOfOrderReason` — required when out-of-sequence (≥3 chars). */
  const [outOfOrderReason, setOutOfOrderReason] = React.useState<string>('');
  /** Backend `unplannedReason` — required for unplanned visits. */
  const [unplannedReason, setUnplannedReason] = React.useState<UnplannedReason>(
    'AVAILABLE_UNEXPECTEDLY'
  );

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDb();
      const payload = {
        notes,
        mood,
        productIds: Array.from(selectedProducts),
        primaryProductId,
        samples,
        orderTaken,
        followUpDate,
        outOfOrderReason,
        unplannedReason,
        planItemId: planItem?._id,
        doctorId: targetDoctorId,
        startedAt: startedAt.toISOString(),
      };
      if (!cancelled) {
        await db.runAsync(
          `INSERT OR REPLACE INTO visit_drafts (client_uuid, plan_item_id, doctor_id, started_at, payload_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            clientUuid,
            planItem?._id ?? null,
            targetDoctorId ?? null,
            startedAt.toISOString(),
            JSON.stringify(payload),
            Date.now(),
          ]
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    notes,
    mood,
    selectedProducts,
    samples,
    primaryProductId,
    orderTaken,
    followUpDate,
    outOfOrderReason,
    unplannedReason,
    planItem?._id,
    targetDoctorId,
    clientUuid,
    startedAt,
  ]);

  const duration = React.useMemo(() => {
    const d = intervalToDuration({ start: startedAt, end: now });
    const mm = String(d.minutes ?? 0).padStart(2, '0');
    const ss = String(d.seconds ?? 0).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [startedAt, now]);

  function buildBaseBody() {
    const totalSamples = Object.values(samples).reduce((acc, n) => acc + (n > 0 ? n : 0), 0);
    const samplesGiven =
      Object.entries(samples)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => `${productId}:${qty}`)
        .join(',') || undefined;

    const moodTag = mood ? `[mood:${mood}]` : '';
    const combinedNotes = [notes.trim(), moodTag].filter(Boolean).join(' ').trim();

    /**
     * Omit visitTime / checkIn / checkOut — Joi coerces ISO strings to Date objects and
     * the service's `DateTime.fromISO(String(date))` then fails. Web omits these too;
     * the server stamps visit time at submit.
     */
    return {
      notes: combinedNotes || undefined,
      orderTaken,
      productsDiscussed: Array.from(selectedProducts),
      primaryProductId: primaryProductId ?? null,
      samplesQty: totalSamples > 0 ? totalSamples : null,
      samplesGiven: samplesGiven ?? null,
      followUpDate: followUpDate || null,
    };
  }

  /** Returns a user-facing validation error string or `null` if the form is valid. */
  function validateBeforeSubmit(): string | null {
    if (mode === 'planned' && isOutOfSequence && outOfOrderReason.trim().length < 3) {
      return 'This visit is out of your planned sequence. Add a reason (3+ characters) in the Wrap-up tab.';
    }
    if (mode === 'unplanned' && !unplannedReason) {
      return 'Pick a reason for this unplanned visit (Wrap-up tab).';
    }
    if (followUpDate && !/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) {
      return 'Follow-up date must look like YYYY-MM-DD.';
    }
    return null;
  }

  const complete = useMutation({
    mutationFn: async () => {
      let location: { lat: number; lng: number } | undefined;
      if (flags.attendanceGeofenceEnabled) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          }
        } catch {
          /* location optional */
        }
      }
      const base = buildBaseBody();
      if (mode === 'planned' && planItem?._id) {
        const input: MarkVisitInput = {
          ...base,
          location,
          clientUuid,
          outOfOrderReason: isOutOfSequence ? outOfOrderReason.trim() : undefined,
        };
        return planItemsApi.markVisit(planItem._id, input);
      }
      const input: UnplannedVisitInput = {
        ...base,
        location,
        clientUuid,
        doctorId: targetDoctorId!,
        unplannedReason,
      };
      return visitsApi.unplanned(input);
    },
    onSuccess: async () => {
      const db = await getDb();
      await db.runAsync(`DELETE FROM visit_drafts WHERE client_uuid = ?`, [clientUuid]);
      toast.show({ tone: 'success', message: 'Visit recorded' });
      qc.invalidateQueries({ queryKey: ['plan-items', 'today'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'home'] });
      goBack();
    },
    onError: async (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr && apiErr.status === 409 && /MISSED/i.test(apiErr.message)) {
        toast.show({
          tone: 'warning',
          title: 'Visit already marked missed',
          message: 'Convert to unplanned visit?',
        });
        return;
      }
      if (apiErr && (apiErr.status >= 500 || apiErr.status === 0 || apiErr.status === 408)) {
        const path =
          mode === 'planned' && planItem?._id
            ? `/plan-items/${planItem._id}/mark-visit`
            : `/visits/unplanned`;
        const base = buildBaseBody();
        const body: Record<string, unknown> = { ...base };
        if (mode === 'planned' && isOutOfSequence) {
          body.outOfOrderReason = outOfOrderReason.trim();
        }
        if (mode === 'unplanned') {
          body.doctorId = targetDoctorId;
          body.unplannedReason = unplannedReason;
        }
        await outbox.enqueueCore({
          feature: 'visit',
          action: mode === 'planned' ? 'mark-visit' : 'unplanned-visit',
          method: 'POST',
          path,
          body,
          clientUuid,
        });
        toast.show({ tone: 'info', message: 'Saved offline — will sync automatically' });
        const db = await getDb();
        await db.runAsync(`DELETE FROM visit_drafts WHERE client_uuid = ?`, [clientUuid]);
        await flushOutbox();
        goBack();
        return;
      }
      const message = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: message ?? 'Could not record visit' });
    },
  });

  function toggleProduct(p: Product) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(p._id)) {
        next.delete(p._id);
        if (primaryProductId === p._id) setPrimaryProductId(null);
      } else {
        next.add(p._id);
        if (!primaryProductId) setPrimaryProductId(p._id);
      }
      return next;
    });
  }

  return (
    <Screen padded={false} scroll={false} edges={['top']} className="flex-1">
      <Header
        back
        title={doctor.data?.name ?? plannedDoctor?.name ?? 'Visit'}
        subtitle={
          doctor.data
            ? formatDoctorHeaderSubtitle(doctor.data)
            : plannedDoctor?.specialization ?? undefined
        }
      />
      <View className="px-4 py-2">
        <Card padded>
          <View className="flex-row items-center justify-between">
            <View>
              <Subtitle>Visit timer</Subtitle>
              <Text size="2xl" weight="bold">
                {duration}
              </Text>
            </View>
            <Badge tone={mode === 'planned' ? 'primary' : 'info'}>
              {mode === 'planned' ? 'PLANNED' : 'UNPLANNED'}
            </Badge>
          </View>
        </Card>
      </View>

      <Tabs
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          { key: 'details', label: 'Details' },
          { key: 'products', label: 'Products', count: selectedProducts.size },
          { key: 'samples', label: 'Samples' },
          { key: 'notes', label: 'Notes' },
          { key: 'wrapup', label: 'Wrap-up' },
        ]}
      />
      {mode === 'planned' && isOutOfSequence ? (
        <View className="px-4 pt-2">
          <Badge tone="warning">Out of planned sequence — add reason in Wrap-up</Badge>
        </View>
      ) : null}

      <ScrollView contentContainerClassName="px-4 pb-32 pt-1">
        {tab === 'details' ? <DetailsTab doctor={doctor.data ?? null} /> : null}
        {tab === 'products' ? (
          <ProductsTab
            products={products.data ?? []}
            selected={selectedProducts}
            primaryProductId={primaryProductId}
            onToggle={toggleProduct}
            onSetPrimary={setPrimaryProductId}
          />
        ) : null}
        {tab === 'samples' ? (
          <SamplesTab
            products={(products.data ?? []).filter((p) => selectedProducts.has(p._id))}
            samples={samples}
            onChange={setSamples}
          />
        ) : null}
        {tab === 'notes' ? (
          <NotesTab
            notes={notes}
            onNotesChange={setNotes}
            mood={mood}
            onMoodChange={setMood}
          />
        ) : null}
        {tab === 'wrapup' ? (
          <WrapUpTab
            mode={mode}
            isOutOfSequence={isOutOfSequence}
            orderTaken={orderTaken}
            onOrderTakenChange={setOrderTaken}
            followUpDate={followUpDate}
            onFollowUpChange={setFollowUpDate}
            outOfOrderReason={outOfOrderReason}
            onOutOfOrderReasonChange={setOutOfOrderReason}
            unplannedReason={unplannedReason}
            onUnplannedReasonChange={setUnplannedReason}
          />
        ) : null}
      </ScrollView>

      <StickyActionBar>
        <Button
          onPress={() => {
            const err = validateBeforeSubmit();
            if (err) {
              setTab('wrapup');
              toast.show({ tone: 'warning', message: err });
              return;
            }
            complete.mutate();
          }}
          loading={complete.isPending}
          fullWidth
        >
          Complete visit
        </Button>
      </StickyActionBar>
    </Screen>
  );
};

function territoryLine(doctor: Doctor | null): string {
  if (!doctor) return '—';
  if (doctor.territoryId && typeof doctor.territoryId === 'object' && doctor.territoryId.name) {
    return doctor.territoryId.name;
  }
  return [doctor.doctorBrick, doctor.zone].filter(Boolean).join(' · ') || '—';
}

const DetailsTab: React.FC<{ doctor: Doctor | null }> = ({ doctor }) => (
  <Card className="mt-2">
    <H2 className="mb-2">Doctor</H2>
    <ListRow title="Specialization" subtitle={doctor?.specialization ?? '—'} />
    <Divider />
    <ListRow title="Qualification" subtitle={doctor?.qualification ?? '—'} />
    <Divider />
    <ListRow title="Designation" subtitle={doctor?.designation ?? '—'} />
    <Divider />
    <ListRow title="Territory / brick" subtitle={territoryLine(doctor)} />
    <Divider />
    <ListRow title="Doctor code" subtitle={doctor?.doctorCode ?? '—'} />
    <Divider />
    <ListRow title="Location" subtitle={doctor?.locationName ?? '—'} />
    <Divider />
    <ListRow
      title="Address"
      subtitle={[doctor?.address, doctor?.city].filter(Boolean).join(', ') || '—'}
    />
    <Divider />
    <ListRow title="Phone" subtitle={doctor?.phone ?? doctor?.mobileNo ?? '—'} />
    <Divider />
    <ListRow title="PMDC" subtitle={doctor?.pmdcRegistration ?? '—'} />
    <AddPhotoButton
      cameraOnly
      label="Visit photo"
      helper="Captures stay on-device until enabled"
      className="mt-4"
      onPick={() => undefined}
    />
  </Card>
);

const ProductsTab: React.FC<{
  products: Product[];
  selected: Set<string>;
  primaryProductId: ID | null;
  onToggle: (p: Product) => void;
  onSetPrimary: (id: ID | null) => void;
}> = ({ products, selected, primaryProductId, onToggle, onSetPrimary }) => (
  <View>
    <ProductVisualViewer className="mt-1" />
    <Card className="mt-1" padded={false}>
      <View className="px-3 py-2">
        <Subtitle>Detail products with the doctor</Subtitle>
      </View>
      <Divider />
      {products.map((p, i) => {
        const isSelected = selected.has(p._id);
        const isPrimary = primaryProductId === p._id;
        return (
          <View key={p._id}>
            <ListRow
              title={p.name}
              subtitle={[p.sku, p.packSize].filter(Boolean).join(' · ')}
              left={
                <View className="h-9 w-9 rounded-lg bg-primary-50 items-center justify-center">
                  <Pill size={18} color="#2563eb" />
                </View>
              }
              right={
                <Badge tone={isPrimary ? 'success' : isSelected ? 'primary' : 'muted'}>
                  {isPrimary ? 'Primary' : isSelected ? 'Detailed' : 'Add'}
                </Badge>
              }
              onPress={() => {
                if (!isSelected) {
                  onToggle(p);
                } else if (!isPrimary) {
                  onSetPrimary(p._id);
                } else {
                  onToggle(p);
                }
              }}
              className="px-3"
            />
            {i < products.length - 1 ? <Divider /> : null}
          </View>
        );
      })}
      {products.length === 0 ? (
        <View className="px-4 py-6">
          <Text size="sm" tone="muted">
            No products configured. Ask your admin to add the product catalog.
          </Text>
        </View>
      ) : null}
    </Card>
  </View>
);

const SamplesTab: React.FC<{
  products: Product[];
  samples: Record<string, number>;
  onChange: (s: Record<string, number>) => void;
}> = ({ products, samples, onChange }) => (
  <Card className="mt-2" padded={false}>
    <View className="px-3 py-2">
      <Subtitle>Samples distributed</Subtitle>
    </View>
    <Divider />
    {products.length === 0 ? (
      <View className="px-4 py-6">
        <Text size="sm" tone="muted">
          Add at least one product from the Products tab to record samples.
        </Text>
      </View>
    ) : (
      products.map((p, i) => (
        <View key={p._id}>
          <View className="px-3 py-3 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text size="base" weight="medium" numberOfLines={1}>
                {p.name}
              </Text>
              <Text size="xs" tone="muted">
                {p.packSize ?? ''}
              </Text>
            </View>
            <NumberStepper
              value={samples[p._id] ?? 0}
              onChange={(v) => onChange({ ...samples, [p._id]: v })}
              min={0}
              max={50}
            />
          </View>
          {i < products.length - 1 ? <Divider /> : null}
        </View>
      ))
    )}
  </Card>
);

const NotesTab: React.FC<{
  notes: string;
  onNotesChange: (v: string) => void;
  mood?: MoodKey;
  onMoodChange: (m: MoodKey) => void;
}> = ({ notes, onNotesChange, mood, onMoodChange }) => (
  <Card className="mt-2">
    <H2 className="mb-3">Doctor feedback</H2>
    <View className="flex-row mb-4">
      {moodOptions.map((m) => (
        <View key={m.key} className="flex-1 mr-2">
          <Button
            variant={mood === m.key ? 'primary' : 'outline'}
            onPress={() => onMoodChange(m.key)}
            leftIcon={m.icon}
            fullWidth
          >
            {m.label}
          </Button>
        </View>
      ))}
    </View>
    <TextField
      label="Notes"
      value={notes}
      onChangeText={onNotesChange}
      placeholder="Topics discussed, objections, next steps"
      multiline
      numberOfLines={5}
      inputClassName="min-h-24"
      leftIcon={<StickyNote size={16} color="#64748b" />}
    />
    <ListRow
      title="Follow-up date"
      subtitle="Set this in the Wrap-up tab"
      left={<ClipboardList size={18} color="#0f172a" />}
    />
  </Card>
);

interface WrapUpTabProps {
  mode: Mode;
  isOutOfSequence: boolean;
  orderTaken: boolean;
  onOrderTakenChange: (v: boolean) => void;
  followUpDate: string;
  onFollowUpChange: (v: string) => void;
  outOfOrderReason: string;
  onOutOfOrderReasonChange: (v: string) => void;
  unplannedReason: UnplannedReason;
  onUnplannedReasonChange: (v: UnplannedReason) => void;
}

const WrapUpTab: React.FC<WrapUpTabProps> = ({
  mode,
  isOutOfSequence,
  orderTaken,
  onOrderTakenChange,
  followUpDate,
  onFollowUpChange,
  outOfOrderReason,
  onOutOfOrderReasonChange,
  unplannedReason,
  onUnplannedReasonChange,
}) => (
  <Card className="mt-2">
    <H2 className="mb-2">Wrap up</H2>

    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-2">
        <Text size="base" weight="medium">
          Order taken
        </Text>
        <Text size="xs" tone="muted">
          Toggle if you booked an order during this visit.
        </Text>
      </View>
      <Switch value={orderTaken} onValueChange={onOrderTakenChange} />
    </View>
    <Divider />

    <View className="py-3">
      <DatePickerField
        label="Follow-up date (optional)"
        value={followUpDate}
        onChange={onFollowUpChange}
        placeholder="Select follow-up date"
        minimumDate={new Date()}
      />
    </View>
    <Divider />

    {mode === 'unplanned' ? (
      <View className="py-3">
        <Text size="base" weight="medium" className="mb-2">
          Why is this unplanned?
        </Text>
        <View className="flex-row flex-wrap">
          {(Object.keys(UNPLANNED_REASON_LABELS) as UnplannedReason[]).map((reason) => (
            <View key={reason} className="mr-2 mb-2">
              <Button
                variant={unplannedReason === reason ? 'primary' : 'outline'}
                size="sm"
                onPress={() => onUnplannedReasonChange(reason)}
              >
                {UNPLANNED_REASON_LABELS[reason]}
              </Button>
            </View>
          ))}
        </View>
      </View>
    ) : null}

    {mode === 'planned' && isOutOfSequence ? (
      <>
        <Divider />
        <View className="py-3">
          <Text size="base" weight="medium">
            Out-of-sequence reason
          </Text>
          <Text size="xs" tone="warning" className="mb-2">
            Required: at least 3 characters. The visit is not next in your planned sequence.
          </Text>
          <TextField
            label=""
            value={outOfOrderReason}
            onChangeText={onOutOfOrderReasonChange}
            placeholder="Doctor available now, will revisit later doctors after"
            multiline
            numberOfLines={3}
            leftIcon={<ReceiptText size={16} color="#64748b" />}
            containerClassName="mb-0"
          />
        </View>
      </>
    ) : null}
  </Card>
);
