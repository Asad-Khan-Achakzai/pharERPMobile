import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from './Text';

type Tone = 'info' | 'success' | 'danger' | 'warning';

interface ToastItem {
  id: number;
  tone: Tone;
  title?: string;
  message: string;
  durationMs: number;
}

interface ToastContextValue {
  show(p: { tone?: Tone; title?: string; message: string; durationMs?: number }): void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let nextId = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback<ToastContextValue['show']>((p) => {
    const id = nextId++;
    setItems((prev) => [
      ...prev,
      {
        id,
        tone: p.tone ?? 'info',
        title: p.title,
        message: p.message,
        durationMs: p.durationMs ?? 2400,
      },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-4 bottom-12"
      >
        {items.map((t) => (
          <ToastBubble key={t.id} item={t} onDone={() => remove(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const toneSurface: Record<Tone, string> = {
  info: 'bg-slate-900',
  success: 'bg-success',
  danger: 'bg-destructive',
  warning: 'bg-warning',
};

const ToastBubble: React.FC<{ item: ToastItem; onDone(): void }> = ({ item, onDone }) => {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(20);
  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 180 });
    translate.value = withTiming(0, { duration: 220 });
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
      translate.value = withTiming(20, { duration: 220 });
    }, item.durationMs);
    return () => clearTimeout(timer);
  }, [item.durationMs, onDone, opacity, translate]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));
  return (
    <Animated.View style={aStyle} className={`mt-2 rounded-xl px-4 py-3 ${toneSurface[item.tone]}`}>
      {item.title ? (
        <Text size="sm" weight="semibold" tone="inverse">
          {item.title}
        </Text>
      ) : null}
      <Text size="sm" tone="inverse">
        {item.message}
      </Text>
    </Animated.View>
  );
};

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      show: ({ message }) => {
        if (__DEV__) {
          console.warn('[Toast] outside provider:', message);
        }
      },
    };
  }
  return ctx;
}
