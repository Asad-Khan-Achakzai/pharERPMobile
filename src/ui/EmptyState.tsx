import * as React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => (
  <View className={cn('items-center justify-center px-6 py-12', className)}>
    {icon ? <View className="mb-3">{icon}</View> : null}
    <Text size="md" weight="semibold" className="mb-1 text-center">
      {title}
    </Text>
    {description ? (
      <Text size="sm" tone="muted" className="text-center mb-4">
        {description}
      </Text>
    ) : null}
    {actionLabel && onAction ? (
      <Button variant="primary" onPress={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </View>
);

export const ErrorState: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = 'Something went wrong',
  description = 'Please try again.',
  onRetry,
  className,
}) => (
  <View className={cn('items-center justify-center px-6 py-10', className)}>
    <Text size="md" weight="semibold" tone="danger" className="mb-1">
      {title}
    </Text>
    <Text size="sm" tone="muted" className="text-center mb-3">
      {description}
    </Text>
    {onRetry ? (
      <Button variant="outline" onPress={onRetry}>
        Retry
      </Button>
    ) : null}
  </View>
);
