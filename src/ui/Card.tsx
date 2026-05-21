import * as React from 'react';
import { View, ViewProps, Pressable, PressableProps } from 'react-native';
import { cn } from '@/utils/cn';

interface CardProps extends ViewProps {
  className?: string;
  padded?: boolean;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  padded = true,
  elevated = false,
  ...rest
}) => (
  <View
    {...rest}
    className={cn(
      'rounded-2xl bg-card border border-border',
      padded && 'p-4',
      elevated && 'shadow-md',
      className,
    )}
  />
);

interface PressableCardProps extends PressableProps {
  className?: string;
  padded?: boolean;
  elevated?: boolean;
}

export const PressableCard: React.FC<PressableCardProps> = ({
  className,
  padded = true,
  elevated = false,
  ...rest
}) => (
  <Pressable
    {...rest}
    android_ripple={{ color: '#e2e8f0' }}
    className={cn(
      'rounded-2xl bg-card border border-border active:bg-muted',
      padded && 'p-4',
      elevated && 'shadow-md',
      className,
    )}
  />
);

export const CardHeader: React.FC<ViewProps & { className?: string }> = ({
  className,
  ...rest
}) => <View {...rest} className={cn('mb-3', className)} />;

export const CardBody: React.FC<ViewProps & { className?: string }> = ({
  className,
  ...rest
}) => <View {...rest} className={cn('', className)} />;

export const CardFooter: React.FC<ViewProps & { className?: string }> = ({
  className,
  ...rest
}) => (
  <View
    {...rest}
    className={cn('mt-3 pt-3 border-t border-border', className)}
  />
);
