/**
 * Edit Doctor (Mobile) — Web Parity Contract
 *
 *  Web reference: `pharmaERPFE/src/views/doctors/list/DoctorListPage.tsx` edit dialog.
 *  Backend route: `PUT /api/v1/doctors/:id`
 *  Backend validator: `updateDoctorSchema` in
 *    `pharmaERPBackend/src/validators/doctor.validator.js` (`.min(1)`)
 *
 *  Includes every field from the web edit dialog plus `isActive` toggle. We
 *  intentionally skip `territoryId` / `assignedRepId` / `monthlyVisitTarget`
 *  / `tier` here — the web edit dialog also skips them; they belong to the
 *  Assign flow.
 */
import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormScreen } from '@/ui/FormScreen';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Switch } from '@/ui/Switch';
import { FormFieldsCardSkeleton } from '@/ui/listCardSkeletons';
import { useToast } from '@/ui/Toast';
import { masterQueries } from '@/data/masterQueries';
import { doctorsApi } from '@/api/doctors';
import { PermissionGate } from '@/auth/PermissionGate';
import type { Doctor } from '@/domain/types';

interface DoctorDraft {
  name: string;
  specialization: string;
  qualification: string;
  designation: string;
  gender: string;
  mobileNo: string;
  phone: string;
  email: string;
  zone: string;
  doctorBrick: string;
  doctorCode: string;
  frequency: string;
  grade: string;
  locationName: string;
  city: string;
  address: string;
  pmdcRegistration: string;
  patientCount: string;
  isActive: boolean;
}

const TEXT_KEYS: (keyof Omit<DoctorDraft, 'isActive' | 'patientCount'>)[] = [
  'name',
  'specialization',
  'qualification',
  'designation',
  'gender',
  'mobileNo',
  'phone',
  'email',
  'zone',
  'doctorBrick',
  'doctorCode',
  'frequency',
  'grade',
  'locationName',
  'city',
  'address',
  'pmdcRegistration',
];

function fromDoctor(d: Doctor): DoctorDraft {
  return {
    name: d.name ?? '',
    specialization: d.specialization ?? '',
    qualification: d.qualification ?? '',
    designation: d.designation ?? '',
    gender: d.gender ?? '',
    mobileNo: d.mobileNo ?? '',
    phone: d.phone ?? '',
    email: d.email ?? '',
    zone: d.zone ?? '',
    doctorBrick: d.doctorBrick ?? '',
    doctorCode: d.doctorCode ?? '',
    frequency: d.frequency ?? '',
    grade: d.grade ?? '',
    locationName: d.locationName ?? '',
    city: d.city ?? '',
    address: d.address ?? '',
    pmdcRegistration: d.pmdcRegistration ?? '',
    patientCount: d.patientCount != null ? String(d.patientCount) : '',
    isActive: d.isActive !== false,
  };
}

function buildUpdatePayload(initial: DoctorDraft, current: DoctorDraft) {
  const out: Record<string, unknown> = {};
  for (const k of TEXT_KEYS) {
    const next = current[k].trim();
    const prev = initial[k].trim();
    if (next !== prev) out[k] = next;
  }
  if (current.patientCount.trim() !== initial.patientCount.trim()) {
    const v = current.patientCount.trim();
    if (v === '') out.patientCount = null;
    else {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 0) out.patientCount = n;
    }
  }
  if (current.isActive !== initial.isActive) out.isActive = current.isActive;
  return out;
}

function EditDoctorImpl() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useQuery({ queryKey: ['doctor', id], queryFn: () => masterQueries.doctorById(id) });

  const [initial, setInitial] = React.useState<DoctorDraft | null>(null);
  const [draft, setDraft] = React.useState<DoctorDraft | null>(null);

  React.useEffect(() => {
    if (q.data && !initial) {
      const seeded = fromDoctor(q.data);
      setInitial(seeded);
      setDraft(seeded);
    }
  }, [q.data, initial]);

  function set<K extends keyof DoctorDraft>(key: K, value: DoctorDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const payload = React.useMemo(
    () => (initial && draft ? buildUpdatePayload(initial, draft) : {}),
    [initial, draft]
  );
  const dirty = Object.keys(payload).length > 0;

  const update = useMutation({
    mutationFn: () => doctorsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', id] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
      toast.show({ tone: 'success', message: 'Doctor updated' });
      router.back();
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not save changes' });
    },
  });

  if (q.isLoading || !draft || !initial) {
    return (
      <Screen padded={false} edges={['bottom']}>
        <Header back title="Edit doctor" />
        <FormFieldsCardSkeleton fields={6} />
      </Screen>
    );
  }

  return (
    <FormScreen
      header={<Header back title="Edit doctor" subtitle={initial.name} />}
      footer={
        <Button
          onPress={() => update.mutate()}
          loading={update.isPending}
          disabled={!dirty}
          fullWidth
        >
          Save changes
        </Button>
      }
    >
      <Card className="mx-4 mt-2">
        <TextField
          label="Name"
          required
          value={draft.name}
          onChangeText={(v) => set('name', v)}
        />
        <TextField
          label="Specialization"
          value={draft.specialization}
          onChangeText={(v) => set('specialization', v)}
        />
        <TextField
          label="Qualification"
          value={draft.qualification}
          onChangeText={(v) => set('qualification', v)}
        />
        <TextField
          label="Designation"
          value={draft.designation}
          onChangeText={(v) => set('designation', v)}
        />
        <TextField label="Gender" value={draft.gender} onChangeText={(v) => set('gender', v)} />
      </Card>

      <Card className="mx-4 mt-2">
        <TextField
          label="Mobile"
          value={draft.mobileNo}
          onChangeText={(v) => set('mobileNo', v)}
          keyboardType="phone-pad"
        />
        <TextField
          label="Phone"
          value={draft.phone}
          onChangeText={(v) => set('phone', v)}
          keyboardType="phone-pad"
        />
        <TextField
          label="Email"
          value={draft.email}
          onChangeText={(v) => set('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Card>

      <Card className="mx-4 mt-2">
        <TextField
          label="Location name"
          value={draft.locationName}
          onChangeText={(v) => set('locationName', v)}
        />
        <TextField label="City" value={draft.city} onChangeText={(v) => set('city', v)} />
        <TextField
          label="Address"
          value={draft.address}
          onChangeText={(v) => set('address', v)}
          multiline
          numberOfLines={2}
        />
        <TextField label="Zone" value={draft.zone} onChangeText={(v) => set('zone', v)} />
        <TextField
          label="Brick"
          value={draft.doctorBrick}
          onChangeText={(v) => set('doctorBrick', v)}
        />
      </Card>

      <Card className="mx-4 mt-2">
        <TextField
          label="Doctor code"
          value={draft.doctorCode}
          onChangeText={(v) => set('doctorCode', v)}
        />
        <TextField label="Grade" value={draft.grade} onChangeText={(v) => set('grade', v)} />
        <TextField
          label="Frequency"
          value={draft.frequency}
          onChangeText={(v) => set('frequency', v)}
        />
        <TextField
          label="PMDC #"
          value={draft.pmdcRegistration}
          onChangeText={(v) => set('pmdcRegistration', v)}
        />
        <TextField
          label="No. of patients"
          value={draft.patientCount}
          onChangeText={(v) => set('patientCount', v)}
          keyboardType="numeric"
        />
      </Card>

      <Card className="mx-4 mt-2">
        <View className="flex-row items-center justify-between py-1">
          <View className="flex-1 pr-2">
            <Text size="base" weight="medium">
              Active
            </Text>
            <Text size="xs" tone="muted">
              Inactive doctors are hidden from list/lookup but remain in history.
            </Text>
          </View>
          <Switch
            value={draft.isActive}
            onValueChange={(v) => set('isActive', v)}
          />
        </View>
      </Card>
    </FormScreen>
  );
}

export default function EditDoctor() {
  return (
    <PermissionGate screen="doctor_edit" title="Edit doctor">
      <EditDoctorImpl />
    </PermissionGate>
  );
}
