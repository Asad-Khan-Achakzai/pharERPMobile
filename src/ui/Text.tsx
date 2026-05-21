import * as React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { cn } from '@/utils/cn';

export type TextTone =
  | 'default'
  | 'muted'
  | 'inverse'
  | 'primary'
  | 'danger'
  | 'success'
  | 'warning';

export type TextSize =
  | '2xs'
  | 'xs'
  | 'sm'
  | 'base'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl';

export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

const sizeClass: Record<TextSize, string> = {
  '2xs': 'text-[10px]',
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
};

const weightClass: Record<TextWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const toneClass: Record<TextTone, string> = {
  default: 'text-slate-900',
  muted: 'text-slate-500',
  inverse: 'text-white',
  primary: 'text-primary',
  danger: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
};

export interface AppTextProps extends TextProps {
  size?: TextSize;
  weight?: TextWeight;
  tone?: TextTone;
  className?: string;
}

export const Text: React.FC<AppTextProps> = ({
  size = 'base',
  weight = 'normal',
  tone = 'default',
  className,
  ...rest
}) => (
  <RNText
    {...rest}
    className={cn(sizeClass[size], weightClass[weight], toneClass[tone], className)}
  />
);

export const H1: React.FC<AppTextProps> = (p) => (
  <Text size="3xl" weight="bold" {...p} />
);
export const H2: React.FC<AppTextProps> = (p) => (
  <Text size="2xl" weight="semibold" {...p} />
);
export const H3: React.FC<AppTextProps> = (p) => (
  <Text size="xl" weight="semibold" {...p} />
);
export const Subtitle: React.FC<AppTextProps> = (p) => (
  <Text size="sm" tone="muted" {...p} />
);
export const Label: React.FC<AppTextProps> = (p) => (
  <Text size="sm" weight="medium" {...p} />
);
