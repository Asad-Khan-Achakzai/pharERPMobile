import * as React from 'react';
import { View } from 'react-native';
import { Text, Label } from '@/ui/Text';
import { SearchField } from '@/ui/SearchField';
import { ListRow, Divider } from '@/ui/ListRow';
import { FilterSelectionBar } from '@/ui/FilterSelectionBar';
import { Badge } from '@/ui/Badge';
import type { ID } from '@/domain/types';

export interface LookupEntity {
  _id: ID;
  name: string;
  subtitle?: string;
}

interface EntityLookupProps {
  label: string;
  helperText?: string;
  required?: boolean;
  value: LookupEntity | null;
  onChange: (entity: LookupEntity | null) => void;
  search: string;
  onSearchChange: (q: string) => void;
  results: LookupEntity[];
  loading?: boolean;
  minSearchLength?: number;
}

export function EntityLookup({
  label,
  helperText,
  required,
  value,
  onChange,
  search,
  onSearchChange,
  results,
  loading,
  minSearchLength = 1,
}: EntityLookupProps) {
  const trimmed = search.trim();
  const showResults = !value && trimmed.length >= minSearchLength;

  return (
    <View className="mb-3">
      <Label>
        {label}
        {required ? ' *' : ''}
      </Label>
      {helperText ? (
        <Text size="xs" tone="muted" className="mb-2">
          {helperText}
        </Text>
      ) : null}
      {value ? (
        <FilterSelectionBar
          label={value.name}
          subtitle={value.subtitle}
          onClear={() => onChange(null)}
        />
      ) : (
        <>
          <SearchField
            value={search}
            onChangeText={onSearchChange}
            placeholder="Type to search…"
          />
          {showResults ? (
            <View className="mt-2 rounded-xl border border-border overflow-hidden">
              {loading ? (
                <Text size="sm" tone="muted" className="p-3">
                  Searching…
                </Text>
              ) : results.length === 0 ? (
                <Text size="sm" tone="muted" className="p-3">
                  No matches for “{trimmed}”.
                </Text>
              ) : (
                results.slice(0, 8).map((row, i) => (
                  <View key={String(row._id)}>
                    <ListRow
                      title={row.name}
                      subtitle={row.subtitle}
                      onPress={() => {
                        onChange(row);
                        onSearchChange('');
                      }}
                      right={<Badge tone="primary">Select</Badge>}
                    />
                    {i < Math.min(results.length, 8) - 1 ? <Divider /> : null}
                  </View>
                ))
              )}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
