import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '@/state/authStore';

export interface PickedMedia {
  uri: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
}

interface PickOptions {
  /** 'camera' forces capture; 'library' opens gallery; 'ask' lets the user choose. */
  source?: 'camera' | 'library' | 'ask';
  /** Max longest-edge in px before upload. Defaults to 1600. */
  maxDimension?: number;
  /** JPEG compression quality 0..1. Defaults to 0.7. */
  quality?: number;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

async function fileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info.exists && typeof info.size === 'number' ? info.size : 0;
  } catch {
    return 0;
  }
}

/**
 * Centralized media capture for the mobile app. Handles permission prompts,
 * camera/library selection, compression (expo-image-manipulator) and size
 * validation against the server media config. Returns a normalized PickedMedia
 * ready to hand to outbox.enqueueMedia, or null if cancelled/denied.
 *
 * This is the single picker used by selfie / visit photo / receipt flows so
 * capture logic is never duplicated per screen.
 */
export function useMediaPicker() {
  const pick = useCallback(async (opts: PickOptions = {}): Promise<PickedMedia | null> => {
    const { source = 'ask', maxDimension = 1600, quality = 0.7 } = opts;
    const media = useAuthStore.getState().serverConfig?.media;
    const maxFileSize = media?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

    const useCamera = await resolveSource(source);
    if (useCamera === null) return null;

    let result: ImagePicker.ImagePickerResult;
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        return null;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        exif: false,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Photo library access is required to attach a photo.');
        return null;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        exif: false,
      });
    }

    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];

    // Compress + resize to keep uploads small and predictable.
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: Math.min(asset.width ?? maxDimension, maxDimension) } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
    );

    const size = await fileSize(manipulated.uri);
    if (maxFileSize && size > maxFileSize) {
      Alert.alert(
        'File too large',
        `The selected image is ${(size / 1024 / 1024).toFixed(1)} MB. Maximum is ${(
          maxFileSize /
          1024 /
          1024
        ).toFixed(0)} MB.`,
      );
      return null;
    }

    return {
      uri: manipulated.uri,
      mime: 'image/jpeg',
      size,
      width: manipulated.width,
      height: manipulated.height,
    };
  }, []);

  return { pick };
}

function resolveSource(source: 'camera' | 'library' | 'ask'): Promise<boolean | null> {
  if (source === 'camera') return Promise.resolve(true);
  if (source === 'library') return Promise.resolve(false);
  return new Promise((resolve) => {
    Alert.alert(
      'Add photo',
      undefined,
      [
        { text: 'Take photo', onPress: () => resolve(true) },
        { text: 'Choose from library', onPress: () => resolve(false) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
