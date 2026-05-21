import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Camera as CameraIcon } from 'lucide-react-native';
import { Text } from '../Text';
import { useFlags } from '@/hooks/useFlags';
import { useGatedAction } from '@/hooks/useGatedAction';
import { cn } from '@/utils/cn';

interface SelfieCaptureButtonProps {
  onCapture?: () => void;
  className?: string;
  testID?: string;
}

export const SelfieCaptureButton: React.FC<SelfieCaptureButtonProps> = ({
  onCapture,
  className,
  testID,
}) => {
  const flags = useFlags();
  const enabled = flags.enableMediaUpload && flags.attendanceSelfieEnabled;
  const fire = useGatedAction(enabled, () => onCapture?.(), 'Selfie capture is not enabled yet.');

  return (
    <Pressable
      onPress={fire}
      accessibilityRole="button"
      accessibilityLabel="Take selfie"
      accessibilityState={{ disabled: !enabled }}
      testID={testID}
      className={cn(
        'border border-dashed border-border bg-muted rounded-2xl h-28 items-center justify-center',
        !enabled && 'opacity-70',
        className,
      )}
    >
      <View className="items-center">
        <CameraIcon size={24} color="#475569" />
        <Text size="sm" weight="medium" className="mt-1.5">
          Take selfie
        </Text>
        <Text size="xs" tone="muted" className="mt-0.5">
          {enabled ? 'Required for check-in' : 'Optional'}
        </Text>
      </View>
    </Pressable>
  );
};
