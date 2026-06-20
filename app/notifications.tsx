import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { format } from 'date-fns';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { PressableCard } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { EmptyState, ThemedEmptyIcon } from '@/ui/EmptyState';
import { notificationsApi } from '@/api/notifications';
import { openNotificationTarget } from '@/features/notifications/notificationNavigation';

export default function Notifications() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: () => notificationsApi.feed(),
    refetchInterval: 60_000,
  });
  return (
    <Screen padded={false} scroll={false}>
      <Header back title="Notifications" />
      {list.isLoading ? (
        <ListSkeletonList count={5} variant="notification" />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          icon={<ThemedEmptyIcon Icon={Bell} />}
          title="You're all caught up"
          description="Reminders and announcements will appear here."
        />
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(n) => n._id}
          contentContainerClassName="px-4 pt-2 pb-8"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <PressableCard
              onPress={async () => {
                const opened = await openNotificationTarget({
                  link: item.link,
                  kind: item.kind,
                  notificationId: item._id,
                });
                if (opened) {
                  qc.invalidateQueries({ queryKey: ['notifications', 'feed'] });
                }
              }}
            >
              <View className="flex-row items-center">
                <View className="flex-1 pr-2">
                  <Text size="base" weight="semibold" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.body ? (
                    <Subtitle numberOfLines={2}>{item.body}</Subtitle>
                  ) : null}
                  <Text size="xs" tone="muted" className="mt-0.5">
                    {format(new Date(item.createdAt), 'd MMM, HH:mm')}
                  </Text>
                </View>
                {item.read ? null : <Badge tone="primary">New</Badge>}
              </View>
            </PressableCard>
          )}
        />
      )}
    </Screen>
  );
}
