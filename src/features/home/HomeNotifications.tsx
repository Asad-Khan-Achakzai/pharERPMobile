import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import { Card } from '@/ui/Card';
import { Text, H3 } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { notificationsApi } from '@/api/notifications';

/** Announcements / notifications — always shown at bottom of Home. */
export const HomeNotifications: React.FC = () => {
  const router = useRouter();
  const feed = useQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: () => notificationsApi.feed(),
  });

  const items = (feed.data ?? []).slice(0, 3);

  return (
    <Card className="mx-4 mt-3 mb-6">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Bell size={18} color="#0f172a" />
          <H3 className="ml-2">Notifications</H3>
        </View>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push('/notifications')}
          rightIcon={<ChevronRight size={16} color="#2563eb" />}
        >
          <Text tone="primary" size="sm" weight="medium">
            See all
          </Text>
        </Button>
      </View>
      {feed.isLoading ? (
        <Text size="sm" tone="muted">
          Loading…
        </Text>
      ) : items.length === 0 ? (
        <Text size="sm" tone="muted">
          No notifications right now.
        </Text>
      ) : (
        items.map((n) => (
          <View key={n._id} className="mb-2">
            <Text size="sm" weight="medium">
              {n.title}
            </Text>
            {n.body ? (
              <Text size="xs" tone="muted" numberOfLines={2}>
                {n.body}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </Card>
  );
};
