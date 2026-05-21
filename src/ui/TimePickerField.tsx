import * as React from 'react';
import { View, Pressable, Platform } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { Clock } from 'lucide-react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';

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
  const [open, setOpen] = React.useState(false);
  const pickerDate = React.useMemo(() => parseTimeValue(value), [value]);
  /** Match app light surfaces — avoids invisible wheels when OS is in dark mode. */
  const pickerBackground = '#ffffff';
  const pickerTextColor = '#0f172a';

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
        className={cn(
          'flex-row items-center rounded-xl border border-input bg-input-background px-3 py-3',
          open ? 'border-primary' : '',
        )}
      >
        <Clock size={18} color="#64748b" />
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
          className="mt-2 rounded-xl border border-border overflow-hidden"
          style={{ backgroundColor: pickerBackground }}
        >
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="spinner"
            onChange={onPickerChange}
            themeVariant="light"
            textColor={pickerTextColor}
            accentColor="#2563eb"
            style={{
              width: '100%',
              height: 216,
              backgroundColor: pickerBackground,
            }}
          />
          <Pressable
            onPress={() => setOpen(false)}
            className="py-2.5 items-center border-t border-border"
            style={{ backgroundColor: pickerBackground }}
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
