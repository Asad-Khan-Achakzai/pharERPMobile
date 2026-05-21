import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Camera as CameraIcon, Image as ImageIcon } from 'lucide-react-native';
import { Text } from '../Text';
import { useFlags } from '@/hooks/useFlags';
import { useGatedAction } from '@/hooks/useGatedAction';
import { cn } from '@/utils/cn';

interface AddPhotoButtonProps {
  /** When true, the button uses the camera-only icon instead of generic photo. */
  cameraOnly?: boolean;
  onPick?: () => void;
  label?: string;
  helper?: string;
  className?: string;
  /**
   * Defaults to the visit photo flag. Override for non-visit contexts.
   * The UI remains identical whether the flag is on or off; only the action
   * differs (no-op + toast vs. real pick flow).
   */
  feature?: 'visitPhoto' | 'expenseReceipt' | 'productMedia' | 'media';
  testID?: string;
}

export const AddPhotoButton: React.FC<AddPhotoButtonProps> = ({
  cameraOnly,
  onPick,
  label,
  helper,
  className,
  feature = 'visitPhoto',
  testID,
}) => {
  const flags = useFlags();
  const enabled = (() => {
    if (feature === 'visitPhoto') return flags.enableMediaUpload && flags.enableVisitPhotos;
    if (feature === 'expenseReceipt')
      return flags.enableMediaUpload && flags.enableExpenseReceipts;
    if (feature === 'productMedia')
      return flags.enableMediaUpload && flags.enableProductMedia;
    return flags.enableMediaUpload;
  })();
  const fire = useGatedAction(enabled, () => onPick?.(), 'Photo upload is not enabled yet.');

  return (
    <Pressable
      onPress={fire}
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Add photo'}
      accessibilityState={{ disabled: !enabled }}
      testID={testID}
      className={cn(
        'border border-dashed border-border bg-muted rounded-2xl h-24 items-center justify-center px-4',
        !enabled && 'opacity-70',
        className,
      )}
    >
      <View className="items-center">
        {cameraOnly ? (
          <CameraIcon size={22} color="#475569" />
        ) : (
          <ImageIcon size={22} color="#475569" />
        )}
        <Text size="sm" weight="medium" className="mt-1.5">
          {label ?? (cameraOnly ? 'Take photo' : 'Add photo')}
        </Text>
        {helper ? (
          <Text size="xs" tone="muted" className="mt-0.5">
            {helper}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};
