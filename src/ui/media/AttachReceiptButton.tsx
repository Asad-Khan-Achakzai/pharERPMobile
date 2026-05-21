import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Paperclip } from 'lucide-react-native';
import { Text } from '../Text';
import { useFlags } from '@/hooks/useFlags';
import { useGatedAction } from '@/hooks/useGatedAction';
import { cn } from '@/utils/cn';

interface AttachReceiptButtonProps {
  onAttach?: () => void;
  helper?: string;
  className?: string;
  variant?: 'expense' | 'payment';
  testID?: string;
}

export const AttachReceiptButton: React.FC<AttachReceiptButtonProps> = ({
  onAttach,
  helper,
  className,
  variant = 'expense',
  testID,
}) => {
  const flags = useFlags();
  const enabled =
    flags.enableMediaUpload &&
    (variant === 'expense' ? flags.enableExpenseReceipts : flags.enableMediaUpload);
  const fire = useGatedAction(enabled, () => onAttach?.(), 'Receipt attachments are not enabled yet.');

  return (
    <Pressable
      onPress={fire}
      accessibilityRole="button"
      accessibilityLabel="Attach receipt"
      accessibilityState={{ disabled: !enabled }}
      testID={testID}
      className={cn(
        'flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3',
        !enabled && 'opacity-70',
        className,
      )}
    >
      <View className="flex-row items-center">
        <Paperclip size={18} color="#475569" />
        <Text size="sm" weight="medium" className="ml-2">
          Attach receipt
        </Text>
      </View>
      <Text size="xs" tone="muted">
        {helper ?? (enabled ? 'Tap to attach' : 'Optional')}
      </Text>
    </Pressable>
  );
};
