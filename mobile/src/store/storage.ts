import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * AsyncStorage-backed JSON storage for zustand.
 * ONLY non-sensitive data (UI prefs, public listing JSON) may be stored here.
 * Tokens / credentials go to expo-secure-store (see src/lib/secureStorage.ts).
 */
export const asyncJsonStorage = createJSONStorage(() => AsyncStorage);
