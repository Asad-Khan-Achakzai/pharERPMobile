import * as React from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  Pressable,
} from 'react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';

interface TextFieldProps extends Omit<TextInputProps, 'onChange'> {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerClassName?: string;
  inputClassName?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  helper,
  error,
  required,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerClassName,
  inputClassName,
  ...rest
}) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <View className={cn('mb-3', containerClassName)}>
      {label ? (
        <View className="mb-1.5 flex-row">
          <Text size="sm" weight="medium">
            {label}
          </Text>
          {required ? (
            <Text size="sm" weight="medium" tone="danger" className="ml-0.5">
              *
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        className={cn(
          'flex-row items-center rounded-xl border bg-input-background px-3',
          focused ? 'border-primary' : 'border-input',
          error ? 'border-destructive' : '',
        )}
      >
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor="#94a3b8"
          className={cn(
            'flex-1 py-3 text-base text-slate-900',
            inputClassName,
          )}
        />
        {rightIcon ? (
          <Pressable
            disabled={!onRightIconPress}
            onPress={onRightIconPress}
            className="ml-2"
          >
            {rightIcon}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text size="xs" tone="danger" className="mt-1">
          {error}
        </Text>
      ) : helper ? (
        <Text size="xs" tone="muted" className="mt-1">
          {helper}
        </Text>
      ) : null}
    </View>
  );
};
