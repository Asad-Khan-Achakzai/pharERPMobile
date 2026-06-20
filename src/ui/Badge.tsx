import * as React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

export type BadgeTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  outline?: boolean;
}

function flattenChildren(children: React.ReactNode): string {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenChildren).join('');
  return '';
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'default',
  outline,
  className,
  children,
}) => {
  const { colors } = useTheme();

  const styles = React.useMemo(() => {
    const base = {
      default: {
        bg: colors.secondary,
        border: colors.border,
        text: colors.foreground,
      },
      primary: {
        bg: colors.primaryMuted,
        border: colors.primary,
        text: colors.primary,
      },
      success: {
        bg: 'rgba(40, 199, 111, 0.12)',
        border: colors.success,
        text: colors.success,
      },
      warning: {
        bg: 'rgba(255, 159, 67, 0.12)',
        border: colors.warning,
        text: colors.warning,
      },
      danger: {
        bg: 'rgba(255, 76, 81, 0.12)',
        border: colors.destructive,
        text: colors.destructive,
      },
      info: {
        bg: 'rgba(0, 186, 209, 0.12)',
        border: colors.info,
        text: colors.info,
      },
      muted: {
        bg: colors.muted,
        border: colors.border,
        text: colors.mutedForeground,
      },
    }[tone];

    return {
      backgroundColor: outline ? 'transparent' : base.bg,
      borderColor: base.border,
      color: base.text,
    };
  }, [colors, tone, outline]);

  return (
    <View
      className={cn('px-2 py-0.5 rounded-full self-start border', className)}
      style={{
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        borderWidth: outline ? 1 : 0,
      }}
    >
      <Text size="xs" weight="medium" style={{ color: styles.color }}>
        {flattenChildren(children)}
      </Text>
    </View>
  );
};
