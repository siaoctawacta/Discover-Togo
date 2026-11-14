import { Alert, Platform } from 'react-native';

/** Cross-platform confirm dialog (react-native-web has no Alert buttons). */
export function confirm(opts: { title: string; message: string; confirmLabel: string; cancelLabel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    const g = globalThis as unknown as { confirm?: (m: string) => boolean };
    return Promise.resolve(g.confirm ? g.confirm(`${opts.title}\n\n${opts.message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: opts.confirmLabel, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const g = globalThis as unknown as { alert?: (m: string) => void };
    g.alert?.(message ? `${title}\n\n${message}` : title);
  } else Alert.alert(title, message);
}
