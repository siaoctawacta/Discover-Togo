import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { meApi } from '@/api/me';

/**
 * Best-effort push token registration (POST /me/push-token).
 * Skipped on web, simulators/emulators, and when no EAS projectId is configured.
 * Never throws.
 */
export async function registerPushTokenBestEffort(): Promise<void> {
  try {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    if (!Device.isDevice) return;
    const projectId: string | undefined =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return;

    const Notifications = await import('expo-notifications');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (typeof token === 'string' && token.length > 0 && token.length < 512) {
      await meApi.pushToken({ token, platform: Platform.OS });
    }
  } catch {
    // Non-critical: ignore.
  }
}
