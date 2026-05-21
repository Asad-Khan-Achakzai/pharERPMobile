import * as React from 'react';
import { Pressable, PressableProps, ActivityIndicator, View } from 'react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';

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

const surface: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:bg-primary-700',
  secondary: 'bg-secondary active:bg-slate-200 border border-border',
  outline: 'bg-transparent border border-border active:bg-muted',
  ghost: 'bg-transparent active:bg-muted',
  destructive: 'bg-destructive active:opacity-90',
  success: 'bg-success active:opacity-90',
};

const labelTone: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-slate-900',
  outline: 'text-slate-900',
  ghost: 'text-slate-900',
  destructive: 'text-white',
  success: 'text-white',
};

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
  ...rest
}) => {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...rest}
      className={cn(
        'flex-row items-center justify-center',
        sizing[size],
        surface[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' ||
            variant === 'destructive' ||
            variant === 'success'
              ? '#fff'
              : '#0f172a'
          }
        />
      ) : (
        <View className="flex-row items-center">
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          {isTextLikeChildren(children) ? (
            <Text
              weight="medium"
              className={cn(labelSize[size], labelTone[variant], textClassName)}
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
