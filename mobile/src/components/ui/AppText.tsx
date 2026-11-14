import { memo } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme, type ColorTokens } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';
type ColorKey = { [K in keyof ColorTokens]: ColorTokens[K] extends string ? K : never }[keyof ColorTokens];

export interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: ColorKey;
  align?: TextStyle['textAlign'];
}

const VARIANTS: Record<Variant, { size: number; line: number; weight: Weight }> = {
  display: { size: 32, line: 40, weight: 'bold' },
  title: { size: 26, line: 34, weight: 'bold' },
  heading: { size: 18, line: 26, weight: 'semibold' },
  subheading: { size: 15, line: 22, weight: 'semibold' },
  body: { size: 14, line: 21, weight: 'regular' },
  caption: { size: 12, line: 17, weight: 'regular' },
  label: { size: 13, line: 18, weight: 'medium' },
};

/** All text goes through here: theme colors + Poppins + plain text only (never HTML). */
export const AppText = memo(function AppText({ variant = 'body', weight, color = 'text', align, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const v = VARIANTS[variant];
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={1.4}
      style={[
        { color: theme.colors[color], fontFamily: theme.fonts[weight ?? v.weight], fontSize: v.size, lineHeight: v.line, textAlign: align },
        style,
      ]}
    />
  );
});
