import * as React from 'react';
import { View, Pressable, Platform } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parse, isValid } from 'date-fns';
import { Calendar } from 'lucide-react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';

interface DatePickerFieldProps {
  label?: string;
  /** `YYYY-MM-DD` or empty */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minimumDate?: Date;
}

function parseDateValue(value: string): Date {
  const trimmed = value.trim();
  if (trimmed) {
    const parsed = parse(trimmed, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) return parsed;
  }
  const fallback = new Date();
  fallback.setHours(12, 0, 0, 0);
  return fallback;
}

function formatDateValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  className,
  minimumDate,
}) => {
  const [open, setOpen] = React.useState(false);
  const pickerDate = React.useMemo(() => parseDateValue(value), [value]);
  const pickerBackground = '#ffffff';
  const pickerTextColor = '#0f172a';

  const displayLabel = React.useMemo(() => {
    if (!value.trim()) return placeholder;
    const d = parseDateValue(value);
    return format(d, 'EEE, d MMM yyyy');
  }, [value, placeholder]);

  function applyDate(date: Date | undefined) {
    if (!date) return;
    onChange(formatDateValue(date));
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'dismissed') return;
    }
    applyDate(date);
  }

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
        accessibilityLabel={label ? `${label}, ${displayLabel}` : displayLabel}
        onPress={() => setOpen((v) => !v)}
        className={cn(
          'flex-row items-center rounded-xl border border-input bg-input-background px-3 py-3',
          open ? 'border-primary' : '',
        )}
      >
        <Calendar size={18} color="#64748b" />
        <Text
          size="base"
          className="flex-1 ml-2"
          tone={hasValue ? 'default' : 'muted'}
        >
          {displayLabel}
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
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
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
          mode="date"
          minimumDate={minimumDate}
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
};
