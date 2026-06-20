import * as React from 'react';
import { View, Pressable, Platform } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { Clock } from 'lucide-react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

interface TimePickerFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function parseTimeValue(value: string): Date {
  const trimmed = value.trim();
  if (trimmed) {
    const parsed = parse(trimmed, 'HH:mm', new Date());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fallback = new Date();
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}

function formatTimeValue(date: Date): string {
  return format(date, 'HH:mm');
}

export const TimePickerField: React.FC<TimePickerFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select time',
  className,
}) => {
  const { colors, resolved } = useTheme();
  const [open, setOpen] = React.useState(false);
  const pickerDate = React.useMemo(() => parseTimeValue(value), [value]);

  function applyTime(date: Date | undefined) {
    if (!date) return;
    onChange(formatTimeValue(date));
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'dismissed') return;
    }
    applyTime(date);
  }

  const display = value.trim() || placeholder;
  const hasValue = !!value.trim();

  return (
    <View className={cn('mb-0', className)}>
      {label ? (
        <Text size="sm" weight="medium" className="mb-1.5">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${display}` : display}
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center rounded-xl border px-3 py-3"
        style={{
          backgroundColor: colors.inputBackground,
          borderColor: open ? colors.primary : colors.input,
        }}
      >
        <Clock size={18} color={colors.mutedForeground} />
        <Text
          size="base"
          className="flex-1 ml-2"
          tone={hasValue ? 'default' : 'muted'}
        >
          {display}
        </Text>
        {hasValue ? (
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation?.();
              onChange('');
              setOpen(false);
            }}
          >
            <Text size="xs" tone="muted">
              Clear
            </Text>
          </Pressable>
        ) : null}
      </Pressable>

      {open && Platform.OS === 'ios' ? (
        <View
          className="mt-2 rounded-xl border overflow-hidden"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="spinner"
            onChange={onPickerChange}
            themeVariant={resolved}
            textColor={colors.foreground}
            accentColor={colors.primary}
            style={{
              width: '100%',
              height: 216,
              backgroundColor: colors.card,
            }}
          />
          <Pressable
            onPress={() => setOpen(false)}
            className="py-2.5 items-center border-t"
            style={{ backgroundColor: colors.card, borderTopColor: colors.border }}
          >
            <Text size="sm" weight="semibold" tone="primary">
              Done
            </Text>
          </Pressable>
        </View>
      ) : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          is24Hour
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
};
