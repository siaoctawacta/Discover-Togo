import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme';
import { noWebOutline } from '@/theme/web';
import { AppText } from './AppText';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
  hint?: string;
}

export const TextField = forwardRef<ComponentRef<typeof TextInput>, Props>(function TextField(
  { label, error, icon, secureToggle, secureTextEntry, hint, style, multiline, ...rest },
  ref,
) {
  const { colors, fonts, radius } = useTheme();
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <AppText variant="label" color="textMuted">
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.box,
          {
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surfaceMuted,
            borderRadius: multiline ? radius.md : radius.pill,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginTop: multiline ? 12 : 0 }} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          style={[
            styles.input,
            { color: colors.text, fontFamily: fonts.regular, minHeight: multiline ? 120 : 48, textAlignVertical: multiline ? 'top' : 'center' },
            noWebOutline,
            style,
          ]}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button" accessibilityLabel="toggle password visibility">
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flexDirection: 'row', borderWidth: 1, paddingHorizontal: 16, gap: 10 },
  input: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 10 },
});
