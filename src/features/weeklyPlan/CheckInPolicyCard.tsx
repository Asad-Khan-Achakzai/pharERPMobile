import * as React from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/ui/Card';
import { Text, Label } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { FilterChip } from '@/ui/FilterChip';
import { useToast } from '@/ui/Toast';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { DoctorPickerSheet } from '@/features/weeklyPlan/DoctorPickerSheet';
import type { CheckInConfiguration, CheckInPolicyType, Doctor, ID } from '@/domain/types';

const POLICY_OPTIONS: { key: CheckInPolicyType; label: string }[] = [
  { key: 'COMPANY_DEFAULT', label: 'Company default' },
  { key: 'FIRST_PLANNED_VISIT', label: 'First visit' },
  { key: 'SPECIFIC_DOCTOR', label: 'Specific doctor' },
  { key: 'CUSTOM_LOCATION', label: 'Custom location' },
];

type Props = {
  planId: ID;
  disabled?: boolean;
  initial?: CheckInConfiguration | null;
};

export function CheckInPolicyCard({ planId, disabled, initial }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const [policyType, setPolicyType] = React.useState<CheckInPolicyType>(
    initial?.policyType ?? 'COMPANY_DEFAULT',
  );
  const [doctor, setDoctor] = React.useState<Doctor | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [locationName, setLocationName] = React.useState(
    initial?.customLocation?.locationName ?? '',
  );
  const [latitude, setLatitude] = React.useState(
    initial?.customLocation?.latitude != null ? String(initial.customLocation.latitude) : '',
  );
  const [longitude, setLongitude] = React.useState(
    initial?.customLocation?.longitude != null ? String(initial.customLocation.longitude) : '',
  );
  const [radiusMeters, setRadiusMeters] = React.useState(
    initial?.customLocation?.radiusMeters != null
      ? String(initial.customLocation.radiusMeters)
      : '150',
  );

  React.useEffect(() => {
    if (!initial) return;
    setPolicyType(initial.policyType ?? 'COMPANY_DEFAULT');
    setLocationName(initial.customLocation?.locationName ?? '');
    setLatitude(
      initial.customLocation?.latitude != null ? String(initial.customLocation.latitude) : '',
    );
    setLongitude(
      initial.customLocation?.longitude != null ? String(initial.customLocation.longitude) : '',
    );
    setRadiusMeters(
      initial.customLocation?.radiusMeters != null
        ? String(initial.customLocation.radiusMeters)
        : '150',
    );
  }, [initial]);

  const save = useMutation({
    mutationFn: () => {
      const body: CheckInConfiguration = { policyType };
      if (policyType === 'SPECIFIC_DOCTOR' && doctor?._id) {
        body.doctorId = doctor._id;
      }
      if (policyType === 'CUSTOM_LOCATION') {
        body.customLocation = {
          locationName: locationName.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusMeters: Number(radiusMeters) || 150,
        };
      }
      return weeklyPlansApi.update(planId, { checkInConfiguration: body });
    },
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Check-in policy saved' });
      qc.invalidateQueries({ queryKey: ['plan', planId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not save check-in policy' });
    },
  });

  return (
    <Card className="mx-4 mt-2">
      <Label>Check-in policy</Label>
      <Text size="xs" tone="muted" className="mb-2">
        Where to start the day this week. Attendance is never blocked — out-of-zone is flagged only.
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-3">
        {POLICY_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.key}
            label={opt.label}
            selected={policyType === opt.key}
            disabled={disabled}
            onPress={() => setPolicyType(opt.key)}
          />
        ))}
      </View>

      {policyType === 'SPECIFIC_DOCTOR' ? (
        <View className="mb-2">
          <Button variant="outline" size="sm" disabled={disabled} onPress={() => setPickerOpen(true)}>
            {doctor?.name ?? 'Pick doctor'}
          </Button>
          <DoctorPickerSheet
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            selected={doctor ? [doctor] : []}
            onConfirm={(docs) => {
              setDoctor(docs[0] ?? null);
              setPickerOpen(false);
            }}
          />
        </View>
      ) : null}

      {policyType === 'CUSTOM_LOCATION' ? (
        <>
          <TextField label="Location name" value={locationName} onChangeText={setLocationName} />
          <TextField
            label="Latitude"
            keyboardType="numeric"
            value={latitude}
            onChangeText={setLatitude}
          />
          <TextField
            label="Longitude"
            keyboardType="numeric"
            value={longitude}
            onChangeText={setLongitude}
          />
          <TextField
            label="Radius (meters)"
            keyboardType="numeric"
            value={radiusMeters}
            onChangeText={setRadiusMeters}
          />
        </>
      ) : null}

      {policyType === 'FIRST_PLANNED_VISIT' ? (
        <Text size="xs" tone="muted" className="mb-2">
          Uses the first planned doctor visit each day. Falls back to company default if none scheduled.
        </Text>
      ) : null}

      {!disabled ? (
        <Button
          size="sm"
          className="mt-1"
          loading={save.isPending}
          onPress={() => save.mutate()}
        >
          Save check-in policy
        </Button>
      ) : null}
    </Card>
  );
}
