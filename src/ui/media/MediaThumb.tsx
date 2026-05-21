import * as React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { cn } from '@/utils/cn';

interface MediaThumbProps {
  uri?: string | null;
  size?: number;
  className?: string;
}

export const MediaThumb: React.FC<MediaThumbProps> = ({
  uri,
  size = 64,
  className,
}) => (
  <View
    style={{ width: size, height: size }}
    className={cn('rounded-xl bg-muted items-center justify-center overflow-hidden', className)}
  >
    {uri ? (
      <Image source={{ uri }} className="h-full w-full" contentFit="cover" />
    ) : (
      <ImageOff size={20} color="#94a3b8" />
    )}
  </View>
);
