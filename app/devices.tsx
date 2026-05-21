import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Smartphone, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { SkeletonRow } from '@/ui/Skeleton';
import { useToast } from '@/ui/Toast';
import { authApi } from '@/api/auth';

export default function Devices() {
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authApi.listSessions(),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Session revoked' });
      qc.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: (e: any) =>
      toast.show({ tone: 'danger', message: e?.message ?? 'Could not revoke' }),
  });

  return (
    <Screen padded={false} scroll={false}>
      <Header back title="Devices" subtitle="Active mobile sessions" />
      {list.isLoading ? (
        <View className="px-4">
          <SkeletonRow count={3} />
        </View>
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(s) => s._id}
          contentContainerClassName="px-4 pt-2 pb-8"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Card>
              <View className="flex-row items-center">
                <View className="h-10 w-10 rounded-lg bg-slate-100 items-center justify-center mr-3">
                  <Smartphone size={20} color="#0f172a" />
                </View>
                <View className="flex-1">
                  <Text size="base" weight="semibold" numberOfLines={1}>
                    {[item.brand, item.model].filter(Boolean).join(' ') || 'Device'}
                  </Text>
                  <Subtitle>
                    {item.platform} · {item.osVersion ?? ''}
                  </Subtitle>
                  {item.lastSeenAt ? (
                    <Text size="xs" tone="muted">
                      Last seen {format(new Date(item.lastSeenAt), 'd MMM, HH:mm')}
                    </Text>
                  ) : null}
                </View>
                <Badge tone="default">{item.platform}</Badge>
              </View>
              <View className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 size={14} color="#ef4444" />}
                  onPress={() => revoke.mutate(item._id)}
                >
                  Sign out from this device
                </Button>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
