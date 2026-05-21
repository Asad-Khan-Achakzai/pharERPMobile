import * as React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import { cn } from '@/utils/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  name?: string;
  uri?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizing: Record<AvatarSize, { container: string; text: 'xs' | 'sm' | 'base' | 'lg' }> = {
  xs: { container: 'h-7 w-7', text: 'xs' },
  sm: { container: 'h-9 w-9', text: 'sm' },
  md: { container: 'h-11 w-11', text: 'base' },
  lg: { container: 'h-14 w-14', text: 'lg' },
};

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

export const Avatar: React.FC<AvatarProps> = ({ name, uri, size = 'md', className }) => {
  const cfg = sizing[size];
  if (uri) {
    return (
      <Image
        source={{ uri }}
        className={cn('rounded-full bg-muted', cfg.container, className)}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      className={cn(
        'rounded-full bg-primary-50 items-center justify-center',
        cfg.container,
        className,
      )}
    >
      <Text size={cfg.text} weight="semibold" tone="primary">
        {initials(name)}
      </Text>
    </View>
  );
};
