import * as SecureStore from 'expo-secure-store';

/**
 * A `ReactNativeAsyncStorage`-compatible adapter backed by expo-secure-store,
 * handed to Firebase's `getReactNativePersistence`. This keeps the Firebase
 * refresh/ID tokens in the iOS Keychain / Android Keystore instead of AsyncStorage.
 *
 * SecureStore keys only allow [A-Za-z0-9._-] and large values may be rejected,
 * so keys are escaped and values are chunked.
 */
const CHUNK = 1800;
const PREFIX = 'fbauth.';

function safeKey(key: string): string {
  return PREFIX + key.replace(/[^A-Za-z0-9.-]/g, (c) => `_${c.charCodeAt(0).toString(16)}`);
}

const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

async function removeChunks(base: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(`${base}.n`, opts);
  const count = Number(countRaw ?? 0);
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${base}.${i}`, opts);
  await SecureStore.deleteItemAsync(`${base}.n`, opts);
}

export const secureAuthPersistenceStorage = {
  async getItem(key: string): Promise<string | null> {
    const base = safeKey(key);
    const countRaw = await SecureStore.getItemAsync(`${base}.n`, opts);
    if (countRaw === null) return null;
    const count = Number(countRaw);
    let out = '';
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${base}.${i}`, opts);
      if (part === null) return null;
      out += part;
    }
    return out;
  },
  async setItem(key: string, value: string): Promise<void> {
    const base = safeKey(key);
    await removeChunks(base);
    const count = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${base}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), opts);
    }
    await SecureStore.setItemAsync(`${base}.n`, String(count), opts);
  },
  async removeItem(key: string): Promise<void> {
    await removeChunks(safeKey(key));
  },
};
