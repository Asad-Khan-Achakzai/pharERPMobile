import * as React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';

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

const surface: Record<BadgeTone, string> = {
  default: 'bg-slate-100',
  primary: 'bg-primary-50',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  danger: 'bg-destructive/10',
  info: 'bg-primary-50',
  muted: 'bg-muted',
};

const outlineSurface: Record<BadgeTone, string> = {
  default: 'border border-slate-300',
  primary: 'border border-primary-200',
  success: 'border border-success',
  warning: 'border border-warning',
  danger: 'border border-destructive',
  info: 'border border-primary-200',
  muted: 'border border-border',
};

const fg: Record<BadgeTone, string> = {
  default: 'text-slate-700',
  primary: 'text-primary-700',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-primary-700',
  muted: 'text-slate-500',
};

/** Flatten React children to a string (RN requires text inside <Text>). */
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
}) => (
  <View
    className={cn(
      'px-2 py-0.5 rounded-full self-start',
      outline ? outlineSurface[tone] : surface[tone],
      className,
    )}
  >
    <Text size="xs" weight="medium" className={fg[tone]}>
      {flattenChildren(children)}
    </Text>
  </View>
);
