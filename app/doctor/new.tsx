/**
 * Create Doctor (Mobile) — Web Parity Contract
 *
 *  Web reference: `pharmaERPFE/src/views/doctors/list/DoctorListPage.tsx`
 *  Backend route: `POST /api/v1/doctors`
 *  Backend validator: `createDoctorSchema` in
 *    `pharmaERPBackend/src/validators/doctor.validator.js`
 *
 *  All non-territory fields from the web "Create doctor" dialog are exposed
 *  here. Assignment fields (territoryId / assignedRepId / monthlyVisitTarget
 *  / tier) live on the separate Assign flow (PATCH `/doctors/:id/assign`),
 *  mirroring web.
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { useToast } from '@/ui/Toast';
import { doctorsApi } from '@/api/doctors';
import { ApiError } from '@/api/client';
import { PermissionGate } from '@/auth/PermissionGate';
import { outbox } from '@/data/outbox';
import { flushOutbox } from '@/data/syncEngine';
import { useFlags } from '@/hooks/useFlags';

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
}

const EMPTY_DRAFT: DoctorDraft = {
  name: '',
  specialization: '',
  qualification: '',
  designation: '',
  gender: '',
  mobileNo: '',
  phone: '',
  email: '',
  zone: '',
  doctorBrick: '',
  doctorCode: '',
  frequency: '',
  grade: '',
  locationName: '',
  city: '',
  address: '',
  pmdcRegistration: '',
  patientCount: '',
};

function toPayload(d: DoctorDraft) {
  const out: Record<string, unknown> = { name: d.name.trim() };
  const passthroughKeys: (keyof DoctorDraft)[] = [
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
  for (const k of passthroughKeys) {
    const v = d[k].trim();
    if (v) out[k] = v;
  }
  const pc = d.patientCount.trim();
  if (pc) {
    const n = Number(pc);
    if (Number.isInteger(n) && n >= 0) out.patientCount = n;
  }
  return out;
}

function NewDoctorImpl() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const flags = useFlags();

  const [draft, setDraft] = React.useState<DoctorDraft>(EMPTY_DRAFT);
  function set<K extends keyof DoctorDraft>(key: K, value: DoctorDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const valid = draft.name.trim().length >= 1;

  const create = useMutation({
    mutationFn: () => doctorsApi.create(toPayload(draft)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      toast.show({
        tone: 'success',
        message: flags.doctorApprovalRequired ? 'Submitted for approval' : 'Doctor added',
      });
      router.back();
    },
    onError: async (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr && (apiErr.status >= 500 || apiErr.status === 0)) {
        await outbox.enqueueCore({
          feature: 'doctor',
          action: 'create',
          method: 'POST',
          path: '/doctors',
          body: toPayload(draft),
          clientUuid: uuidv4(),
        });
        toast.show({ tone: 'info', message: 'Saved offline — will sync.' });
        await flushOutbox();
        router.back();
        return;
      }
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not save' });
    },
  });

  return (
    <Screen padded={false} keyboardAvoid>
      <Header back title="Add doctor" />

      <Card className="mx-4 mt-2">
        <TextField label="Name" required value={draft.name} onChangeText={(v) => set('name', v)} />
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

      {flags.doctorApprovalRequired ? (
        <Text size="xs" tone="warning" className="mx-4 mt-2">
          This company requires manager approval before the doctor becomes visit-able.
        </Text>
      ) : null}

      <View style={{ height: 12 }} />

      <StickyActionBar>
        <Button
          onPress={() => create.mutate()}
          loading={create.isPending}
          disabled={!valid}
          fullWidth
        >
          Save doctor
        </Button>
      </StickyActionBar>
    </Screen>
  );
}

export default function NewDoctor() {
  return (
    <PermissionGate screen="doctor_new" title="Add doctor">
      <NewDoctorImpl />
    </PermissionGate>
  );
}
