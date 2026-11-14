import { create } from 'zustand';
import * as Location from 'expo-location';
import type { LatLng } from '@/api/types';

type PermissionState = 'unknown' | 'granted' | 'denied';

interface LocationState {
  coords: LatLng | null;
  permission: PermissionState;
  loading: boolean;
  /** Ask for permission (if needed) and read a coarse position. */
  request: () => Promise<LatLng | null>;
  /** Read position only if permission was already granted (no prompt). */
  refreshIfGranted: () => Promise<void>;
}

async function readPosition(): Promise<LatLng | null> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).catch(() => null);
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
  if (!pos) return null;
  // Round to ~100 m: enough for distances, less precise data sent to the API.
  return { lat: Math.round(pos.coords.latitude * 1000) / 1000, lng: Math.round(pos.coords.longitude * 1000) / 1000 };
}

/** Location is kept in memory only (never persisted). */
export const useLocationStore = create<LocationState>()((set, get) => ({
  coords: null,
  permission: 'unknown',
  loading: false,
  request: async () => {
    if (get().loading) return get().coords;
    set({ loading: true });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({ permission: 'denied' });
        return null;
      }
      const coords = await readPosition();
      set({ permission: 'granted', coords });
      return coords;
    } catch {
      set({ permission: 'denied' });
      return null;
    } finally {
      set({ loading: false });
    }
  },
  refreshIfGranted: async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({ permission: status === 'denied' ? 'denied' : 'unknown' });
        return;
      }
      set({ permission: 'granted', coords: await readPosition() });
    } catch {
      /* ignore */
    }
  },
}));
