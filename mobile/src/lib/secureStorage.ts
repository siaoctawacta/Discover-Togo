import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Sensitive values (e.g. dev-auth session) live in the OS keychain / keystore.
 * On web there is no secure enclave, so we keep values in memory only (never localStorage).
 */
const memory = new Map<string, string>();
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return memory.get(key) ?? null;
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      memory.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      memory.delete(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  },
};
