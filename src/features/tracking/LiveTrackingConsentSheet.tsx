import * as React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LogOut, MapPin, Shield, Timer } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import {
  LIVE_TRACKING_PRIVACY_COPY,
  setAcceptedLiveTrackingConsent,
} from './liveTrackingConsent';
import { ensureForegroundLocationPermission } from './backgroundLocationService';

interface LiveTrackingConsentSheetProps {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

const INFO_ITEMS = [
  {
    key: 'checkin',
    Icon: MapPin,
    title: 'Recorded at check-in',
    description: 'Your location is saved when you start the day.',
    color: '#7367F0',
    bg: 'bg-primary-50',
  },
  {
    key: 'active',
    Icon: Timer,
    title: 'Active while you work',
    description: 'Periodic updates help your manager see field coverage.',
    color: '#00BAD1',
    bg: 'bg-slate-50',
  },
  {
    key: 'stop',
    Icon: LogOut,
    title: 'Stops at check-out',
    description: 'Location sharing ends automatically when your day is done.',
    color: '#28C76F',
    bg: 'bg-slate-50',
  },
] as const;

export const LiveTrackingConsentSheet: React.FC<LiveTrackingConsentSheetProps> = ({
  open,
  onClose,
  onAccepted,
}) => {
  const [busy, setBusy] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleAccept = async () => {
    setBusy(true);
    try {
      await setAcceptedLiveTrackingConsent();
      await ensureForegroundLocationPermission();
      onClose();
      onAccepted();
    } finally {
      setBusy(false);
    }
  };

  const platformNote =
    Platform.OS === 'ios'
      ? LIVE_TRACKING_PRIVACY_COPY.iosNote
      : LIVE_TRACKING_PRIVACY_COPY.androidNote;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: 'rgba(15, 23, 42, 0.55)' }]}
          onPress={busy ? undefined : onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View className="items-center pt-1 pb-1">
              <View className="h-14 w-14 rounded-full bg-primary-50 items-center justify-center mb-3">
                <MapPin size={28} color="#7367F0" />
              </View>
              <Text size="xl" weight="semibold" className="text-center">
                {LIVE_TRACKING_PRIVACY_COPY.title}
              </Text>
              <Text size="sm" tone="muted" className="text-center mt-2 px-1 leading-5">
                {LIVE_TRACKING_PRIVACY_COPY.lead}
              </Text>
            </View>

            <View className="gap-2.5 mt-4">
              {INFO_ITEMS.map(({ key, Icon, title, description, color, bg }) => (
                <View
                  key={key}
                  className={`flex-row items-start gap-3 rounded-xl px-3 py-3 ${bg}`}
                >
                  <View className="h-9 w-9 rounded-full bg-white/80 items-center justify-center shrink-0">
                    <Icon size={18} color={color} />
                  </View>
                  <View className="flex-1 min-w-0 pt-0.5">
                    <Text size="sm" weight="semibold">
                      {title}
                    </Text>
                    <Text size="xs" tone="muted" className="mt-0.5 leading-4">
                      {description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="flex-row items-start gap-2 mt-4 rounded-xl bg-muted/40 px-3 py-2.5">
              <Shield size={16} color="#64748b" style={{ marginTop: 1 }} />
              <Text size="xs" tone="muted" className="flex-1 leading-4">
                {platformNote} You can change location access anytime in your phone Settings.
              </Text>
            </View>
          </ScrollView>

          <View
            className="px-4 pt-3 gap-2 border-t"
            style={{ borderTopColor: colors.border }}
          >
            <Button onPress={() => void handleAccept()} loading={busy} fullWidth size="lg">
              Continue & check in
            </Button>
            <Button variant="ghost" onPress={onClose} disabled={busy} fullWidth>
              Not now
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
