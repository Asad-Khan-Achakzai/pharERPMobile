import * as React from 'react';
import { View, Pressable } from 'react-native';
import { CloudUpload } from 'lucide-react-native';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { Text } from '@/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { ConnectionStrength } from '@/features/sync/connectionStatus';

function SignalBars({
  strength,
  activeColor,
  inactiveColor,
}: {
  strength: ConnectionStrength;
  activeColor: string;
  inactiveColor: string;
}) {
  const heights = [4, 6, 8, 10];
  return (
    <View className="flex-row items-end" style={{ gap: 2, height: 12 }}>
      {heights.map((h, i) => {
        const filled = strength > i;
        return (
          <View
            key={h}
            style={{
              width: 3,
              height: h,
              borderRadius: 1,
              backgroundColor: filled ? activeColor : inactiveColor,
              opacity: filled ? 1 : 0.45,
            }}
          />
        );
      })}
    </View>
  );
}

/** Compact connection + optional sync badge for profile cards (Home & More). */
export const ConnectionStatusIndicator: React.FC = () => {
  const status = useSyncStatus();
  const pushWithReturn = usePushWithReturn();
  const { colors } = useTheme();

  const online = status.online;
  const signalColor = online ? colors.success : colors.destructive;
  const pendingTotal = status.pending.core + status.pending.media;
  const hasSyncWork = pendingTotal > 0 || status.pending.failed > 0;

  const syncLabel = (() => {
    if (status.pending.failed > 0) {
      return `${status.pending.failed} sync error${status.pending.failed === 1 ? '' : 's'}`;
    }
    return `${pendingTotal} to sync`;
  })();

  const syncColor = status.pending.failed > 0 ? colors.destructive : colors.primary;

  return (
    <View className="items-end justify-center pl-2">
      <View
        accessibilityLabel={
          online
            ? `Connected via ${status.connectionLabel}. Signal strength ${status.connectionStrength} of 4.`
            : 'Offline'
        }
        className="items-end"
      >
        <SignalBars
          strength={status.connectionStrength}
          activeColor={signalColor}
          inactiveColor={colors.border}
        />
        <Text
          size="2xs"
          weight="medium"
          style={{
            marginTop: 4,
            color: online ? colors.mutedForeground : colors.destructive,
          }}
        >
          {online ? status.connectionLabel : 'Offline'}
        </Text>
      </View>

      {hasSyncWork ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${syncLabel}. Open outbox and sync.`}
          onPress={() => pushWithReturn('/outbox')}
          className="flex-row items-center mt-2"
          hitSlop={8}
        >
          <CloudUpload size={12} color={syncColor} />
          <Text
            size="2xs"
            weight="semibold"
            style={{ marginLeft: 4, color: syncColor }}
          >
            {syncLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};
