import * as React from 'react';
import { Pressable, PressableProps, ActivityIndicator, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
  className?: string;
  textClassName?: string;
  testID?: string;
}

const sizing: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-lg',
  md: 'h-11 px-4 rounded-xl',
  lg: 'h-12 px-5 rounded-xl',
};

const labelSize: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
};

function flattenChildren(children: React.ReactNode): string {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenChildren).join('');
  return '';
}

function isTextLikeChildren(children: React.ReactNode): boolean {
  if (children == null || children === false) return true;
  if (typeof children === 'string' || typeof children === 'number') return true;
  if (Array.isArray(children)) return children.every(isTextLikeChildren);
  return false;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  textClassName,
  children,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const surfaceStyle: ViewStyle = (() => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primary, borderWidth: 0 };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'ghost':
        return { backgroundColor: 'transparent', borderWidth: 0 };
      case 'destructive':
        return { backgroundColor: colors.destructive, borderWidth: 0 };
      case 'success':
        return { backgroundColor: colors.success, borderWidth: 0 };
      default:
        return {};
    }
  })();

  const labelColor =
    variant === 'primary' ||
    variant === 'destructive' ||
    variant === 'success'
      ? colors.primaryForeground
      : colors.foreground;

  const spinnerColor =
    variant === 'primary' ||
    variant === 'destructive' ||
    variant === 'success'
      ? colors.primaryForeground
      : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...rest}
      style={[surfaceStyle, style as ViewStyle]}
      className={cn(
        'flex-row items-center justify-center',
        sizing[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View className="flex-row items-center">
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          {isTextLikeChildren(children) ? (
            <Text
              weight="medium"
              className={cn(labelSize[size], textClassName)}
              style={{ color: labelColor }}
            >
              {flattenChildren(children)}
            </Text>
          ) : (
            children
          )}
          {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
};
