import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Danger, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AppInput(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={[
        styles.input,
        { backgroundColor: theme.backgroundElement, color: theme.text },
        props.style,
      ]}
    />
  );
}

type AppButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ title, loading, variant = 'primary', style, ...rest }: AppButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? Accent : variant === 'danger' ? Danger : theme.backgroundElement;
  const textColor = variant === 'secondary' ? theme.text : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      disabled={loading || rest.disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: pressed || loading || rest.disabled ? 0.6 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText type="smallBold" style={{ color: textColor }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
    alignSelf: 'stretch',
  },
  button: {
    borderRadius: Spacing.three,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 48,
  },
});
