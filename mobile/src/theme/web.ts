import { Platform, type TextStyle } from 'react-native';

/** Removes the browser focus ring on text inputs that already have their own styled container. */
export const noWebOutline: TextStyle | null = Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : null;
