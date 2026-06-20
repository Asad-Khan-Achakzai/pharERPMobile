import * as React from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Phone, MapPin, History, Stethoscope, Pencil } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Avatar } from '@/ui/Avatar';
import { Text, H2, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { ListRow, Divider } from '@/ui/ListRow';
import { DoctorProfilePageSkeleton, ListSkeletonList } from '@/ui/listCardSkeletons';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { masterQueries } from '@/data/masterQueries';
import { doctorsApi } from '@/api/doctors';
import { usePermissions } from '@/hooks/usePermissions';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { doctorMapsUrl, formatDoctorCoords } from '@/features/doctors/doctorDisplay';

export default function DoctorProfile() {
  const pushWithReturn = usePushWithReturn();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = usePermissions();
  const q = useQuery({ queryKey: ['doctor', id], queryFn: () => masterQueries.doctorById(id) });
  const visits = useQuery({
    queryKey: ['doctor', id, 'visits'],
    queryFn: () => doctorsApi.visitHistory(id),
  });

  if (q.isLoading || !q.data) {
    return (
      <View className="flex-1 bg-background">
        <Header back title="Doctor" />
        <Screen padded={false} edges={['bottom']}>
          <DoctorProfilePageSkeleton />
        </Screen>
      </View>
    );
  }
  const d = q.data;

  const isActive = d.isActive !== false;
  const phoneNo = d.phone ?? d.mobileNo ?? '—';
  const addressLine =
    [d.locationName, d.address, d.city, d.zone].filter(Boolean).join(', ') || '—';
  const gpsCoords = formatDoctorCoords(d.latitude, d.longitude);

  const canEdit = can('doctors.edit');

  return (
    <View className="flex-1 bg-background">
      <Header
        back
        title={d.name}
        subtitle={d.specialization ?? undefined}
        right={
          canEdit ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => pushWithReturn(`/doctor/${d._id}/edit`)}
              leftIcon={<Pencil size={14} color="#0f172a" />}
            >
              Edit
            </Button>
          ) : undefined
        }
      />
      <Screen padded={false}>
        <Card className="mx-4 mt-2">
          <View className="flex-row items-center">
            <Avatar name={d.name} size="lg" />
            <View className="ml-3 flex-1">
              <H2>{d.name}</H2>
              <Subtitle>{d.specialization ?? '—'}</Subtitle>
              <View className="flex-row mt-1">
                <Badge tone={isActive ? 'success' : 'muted'}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </View>
            </View>
          </View>
        </Card>

        <Card className="mx-4 mt-2" padded={false}>
          <View className="px-3">
            <ListRow
              left={<Phone size={18} color="#0f172a" />}
              title="Phone"
              subtitle={phoneNo}
            />
            <Divider />
            <ListRow
              left={<MapPin size={18} color="#0f172a" />}
              title="Address"
              subtitle={addressLine}
            />
            <Divider />
            <ListRow
              left={<Stethoscope size={18} color="#0f172a" />}
              title="Location"
              subtitle={d.locationName ?? '—'}
            />
            {gpsCoords ? (
              <>
                <Divider />
                <ListRow
                  left={<MapPin size={18} color="#2563eb" />}
                  title="GPS coordinates"
                  subtitle={gpsCoords}
                  chevron
                  onPress={() =>
                    Linking.openURL(doctorMapsUrl(d.latitude!, d.longitude!))
                  }
                />
              </>
            ) : null}
          </View>
        </Card>

        <Card className="mx-4 mt-2" padded={false}>
          <View className="px-3 py-2 flex-row items-center">
            <History size={16} color="#0f172a" />
            <Text size="sm" weight="semibold" className="ml-2">
              Recent visits
            </Text>
          </View>
          <Divider />
          {visits.isLoading ? (
            <ListSkeletonList count={2} variant="visit" className="px-4 py-4" />
          ) : (visits.data ?? []).length === 0 ? (
            <View className="px-4 py-4">
              <Text size="sm" tone="muted">
                No visits recorded for this doctor yet.
              </Text>
            </View>
          ) : (
            visits.data!.slice(0, 5).map((v, i) => {
              const visitDate = v.visitTime ? new Date(v.visitTime) : null;
              const label =
                v.notes ??
                (visitDate && !Number.isNaN(visitDate.getTime())
                  ? `Visit on ${visitDate.toLocaleDateString()}`
                  : 'Visit');
              return (
                <View key={v._id}>
                  <ListRow
                    title={label}
                    subtitle={v.orderTaken ? 'Order taken' : ''}
                    className="px-3"
                  />
                  {i < Math.min(visits.data!.length, 5) - 1 ? <Divider /> : null}
                </View>
              );
            })
          )}
        </Card>
      </Screen>
      <StickyActionBar>
        <Button fullWidth onPress={() => pushWithReturn(`/visit/unplanned/${d._id}`)}>
          Start visit
        </Button>
      </StickyActionBar>
    </View>
  );
}
