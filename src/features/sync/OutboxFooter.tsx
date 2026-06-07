import * as React from 'react';
import { View, Pressable } from 'react-native';
import { CloudOff, CloudUpload, RefreshCw } from 'lucide-react-native';
import { Text } from '@/ui/Text';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { forceSync } from '@/data/syncEngine';

export const OutboxFooter: React.FC = () => {
  const status = useSyncStatus();
  const pushWithReturn = usePushWithReturn();
  const total = status.pending.core + status.pending.media;
  if (status.online && total === 0 && status.pending.failed === 0) return null;

  const tone = !status.online ? 'bg-slate-900' : status.pending.failed > 0 ? 'bg-destructive' : 'bg-primary';

  return (
    <Pressable
      onPress={() => pushWithReturn('/outbox')}
      className={`mx-4 mt-2 mb-1 ${tone} rounded-2xl px-4 py-3 flex-row items-center justify-between`}
    >
      <View className="flex-row items-center">
        {!status.online ? (
          <CloudOff size={18} color="#fff" />
        ) : (
          <CloudUpload size={18} color="#fff" />
        )}
        <View className="ml-2">
          <Text size="sm" weight="semibold" tone="inverse">
            {!status.online
              ? 'Offline'
              : status.pending.failed > 0
                ? `${status.pending.failed} sync error${status.pending.failed > 1 ? 's' : ''}`
                : 'Syncing in background'}
          </Text>
          <Text size="xs" tone="inverse" className="opacity-80">
            {`${status.pending.core} core · ${status.pending.media} media pending`}
          </Text>
        </View>
      </View>
      <Pressable onPress={() => void forceSync()} hitSlop={10}>
        <RefreshCw size={18} color="#fff" />
      </Pressable>
    </Pressable>
  );
};
