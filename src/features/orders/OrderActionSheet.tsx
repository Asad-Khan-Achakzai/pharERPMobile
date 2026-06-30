import * as React from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { NumberStepper } from '@/ui/NumberStepper';
import { TextField } from '@/ui/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import type { ID } from '@/domain/types';

export interface DeliverLineRow {
  productId: ID;
  productName: string;
  maxQty: number;
  quantity: number;
}

export interface ReturnLineRow {
  productId: ID;
  productName: string;
  maxQty: number;
  quantity: number;
  reason: string;
}

type OrderActionSheetProps =
  | {
      mode: 'deliver';
      open: boolean;
      onClose: () => void;
      items: DeliverLineRow[];
      onItemsChange: React.Dispatch<React.SetStateAction<DeliverLineRow[]>>;
      onConfirm: () => void;
      loading?: boolean;
      error?: string | null;
    }
  | {
      mode: 'return';
      open: boolean;
      onClose: () => void;
      items: ReturnLineRow[];
      onItemsChange: React.Dispatch<React.SetStateAction<ReturnLineRow[]>>;
      onConfirm: () => void;
      loading?: boolean;
      error?: string | null;
    };

export const OrderActionSheet: React.FC<OrderActionSheetProps> = (props) => {
  const { mode, open, onClose, items, onItemsChange, onConfirm, loading, error } = props;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const title = mode === 'deliver' ? 'Deliver items' : 'Return items';
  const subtitle =
    mode === 'deliver'
      ? 'Adjust quantities to deliver for each product.'
      : 'Set return quantities and optional reasons.';
  const emptyMessage =
    mode === 'deliver'
      ? 'Nothing left to deliver on this order.'
      : 'Nothing available to return on this order.';
  const confirmLabel = mode === 'deliver' ? 'Confirm delivery' : 'Confirm return';

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 bg-black/45 justify-end">
          <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close" />
          <View
            className="rounded-t-3xl overflow-hidden"
            style={{
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 12),
              maxHeight: '88%',
            }}
          >
            <View className="items-center pt-3 pb-1">
              <View
                className="h-1 w-10 rounded-full"
                style={{ backgroundColor: colors.border }}
              />
            </View>

            <View className="px-4 pb-3">
              <Text size="lg" weight="semibold">
                {title}
              </Text>
              <Text size="xs" tone="muted" className="mt-1">
                {subtitle}
              </Text>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="px-4 pb-2"
              style={{ flexGrow: 0 }}
            >
              {items.length === 0 ? (
                <Text size="sm" tone="muted" className="py-6 text-center">
                  {emptyMessage}
                </Text>
              ) : mode === 'deliver' ? (
                items.map((item, i) => (
                  <Card key={`${String(item.productId)}-${i}`} className="mb-2">
                    <Text size="sm" weight="medium" numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text size="xs" tone="muted" className="mt-0.5">
                      Remaining: {item.maxQty}
                    </Text>
                    <View className="flex-row items-center justify-end mt-3">
                      <NumberStepper
                        value={item.quantity}
                        min={0}
                        max={item.maxQty}
                        onChange={(v) =>
                          onItemsChange((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, quantity: v } : row
                            )
                          )
                        }
                      />
                    </View>
                  </Card>
                ))
              ) : (
                items.map((item, i) => (
                  <Card key={`${String(item.productId)}-${i}`} className="mb-2">
                    <Text size="sm" weight="medium" numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text size="xs" tone="muted" className="mt-0.5">
                      Available to return: {item.maxQty}
                    </Text>
                    <View className="flex-row items-center justify-end mt-3">
                      <NumberStepper
                        value={item.quantity}
                        min={0}
                        max={item.maxQty}
                        onChange={(v) =>
                          onItemsChange((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, quantity: v } : row
                            )
                          )
                        }
                      />
                    </View>
                    {item.quantity > 0 ? (
                      <TextField
                        placeholder="Reason (optional)"
                        value={item.reason}
                        onChangeText={(t) =>
                          onItemsChange((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, reason: t } : row
                            )
                          )
                        }
                        containerClassName="mt-3 mb-0"
                      />
                    ) : null}
                  </Card>
                ))
              )}
            </ScrollView>

            {error ? (
              <View
                className="mx-4 mb-2 rounded-xl px-3 py-3 border"
                style={{
                  backgroundColor: `${colors.destructive}18`,
                  borderColor: colors.destructive,
                }}
              >
                <Text size="sm" tone="danger" weight="medium">
                  {error}
                </Text>
              </View>
            ) : null}

            <View
              className="flex-row gap-2 px-4 pt-3 border-t"
              style={{ borderTopColor: colors.border }}
            >
              <Button variant="outline" className="flex-1" onPress={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant={mode === 'deliver' ? 'success' : 'destructive'}
                className="flex-1"
                loading={loading}
                onPress={onConfirm}
                disabled={items.length === 0}
              >
                {confirmLabel}
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
