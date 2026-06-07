import * as React from 'react';
import { View, ViewProps, Pressable, PressableProps } from 'react-native';
import { cn } from '@/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

interface CardProps extends ViewProps {
  className?: string;
  padded?: boolean;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  padded = true,
  elevated = false,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }, style]}
      className={cn('rounded-2xl', padded && 'p-4', elevated && 'shadow-md', className)}
    />
  );
};

interface PressableCardProps extends PressableProps {
  className?: string;
  padded?: boolean;
  elevated?: boolean;
}

export const PressableCard: React.FC<PressableCardProps> = ({
  className,
  padded = true,
  elevated = false,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      {...rest}
      android_ripple={{ color: colors.border }}
      style={[{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }, style]}
      className={cn('rounded-2xl active:opacity-90', padded && 'p-4', elevated && 'shadow-md', className)}
    />
  );
};

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
