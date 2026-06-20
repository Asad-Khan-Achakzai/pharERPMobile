import * as React from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/state/authStore';
import { Avatar } from '@/ui/Avatar';
import { Card } from '@/ui/Card';
import { H2, Text, Subtitle } from '@/ui/Text';
import { ConnectionStatusIndicator } from '@/features/sync/ConnectionStatusBar';
import { HomeHeroCardSkeleton } from '@/features/home/homeCardSkeletons';

export const HomeHero: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (!user?.name) {
    return <HomeHeroCardSkeleton />;
  }

  return (
    <Card className="mx-4 mt-4">
      <View className="flex-row items-center">
        <Avatar name={user?.name} size="lg" />
        <View className="ml-3 flex-1">
          <Subtitle>{greeting}</Subtitle>
          <H2 numberOfLines={1}>{user?.name ?? 'Field rep'}</H2>
          <Text size="xs" tone="muted" numberOfLines={1}>
            {company?.name ?? ''}
          </Text>
        </View>
        <ConnectionStatusIndicator />
      </View>
    </Card>
  );
};
