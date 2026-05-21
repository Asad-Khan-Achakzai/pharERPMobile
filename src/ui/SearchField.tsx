import * as React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { cn } from '@/utils/cn';

interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onClear?: () => void;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search',
  className,
  autoFocus,
  onClear,
}) => (
  <View
    className={cn(
      'flex-row items-center rounded-xl bg-muted border border-border px-3 h-11',
      className,
    )}
  >
    <Search size={18} color="#64748b" />
    <TextInput
      autoFocus={autoFocus}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      returnKeyType="search"
      className="flex-1 ml-2 text-base text-slate-900"
    />
    {value.length > 0 ? (
      <Pressable
        accessibilityLabel="Clear search"
        onPress={() => {
          onChangeText('');
          onClear?.();
        }}
        hitSlop={10}
      >
        <X size={18} color="#64748b" />
      </Pressable>
    ) : null}
  </View>
);
