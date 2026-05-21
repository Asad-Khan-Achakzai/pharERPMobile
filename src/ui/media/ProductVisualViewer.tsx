import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { FileText, Image as ImageIcon } from 'lucide-react-native';
import { Text } from '../Text';
import { useFlags } from '@/hooks/useFlags';
import { cn } from '@/utils/cn';

interface ProductVisual {
  id: string;
  title: string;
  thumbUri?: string;
  type: 'image' | 'pdf';
}

interface ProductVisualViewerProps {
  visuals?: ProductVisual[];
  className?: string;
}

export const ProductVisualViewer: React.FC<ProductVisualViewerProps> = ({
  visuals,
  className,
}) => {
  const flags = useFlags();
  const showRealVisuals =
    flags.enableMediaUpload && flags.enableProductMedia && (visuals?.length ?? 0) > 0;

  if (showRealVisuals && visuals) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className={cn(className)}
        contentContainerClassName="px-4 py-2"
      >
        {visuals.map((v) => (
          <View
            key={v.id}
            className="w-40 h-40 rounded-2xl mr-3 bg-muted overflow-hidden border border-border"
          >
            {v.thumbUri ? (
              <Image source={{ uri: v.thumbUri }} className="w-full h-full" contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                {v.type === 'pdf' ? (
                  <FileText size={24} color="#64748b" />
                ) : (
                  <ImageIcon size={24} color="#64748b" />
                )}
              </View>
            )}
            <View className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-black/40">
              <Text size="xs" tone="inverse" numberOfLines={1}>
                {v.title}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View className={cn('mx-4 my-2 rounded-2xl border border-dashed border-border bg-muted p-4', className)}>
      <View className="flex-row items-center mb-1">
        <ImageIcon size={16} color="#475569" />
        <Text size="sm" weight="medium" className="ml-2">
          Visual aid
        </Text>
      </View>
      <Text size="xs" tone="muted">
        Product visuals will appear here once they have been uploaded for this product.
      </Text>
    </View>
  );
};
