import { Platform } from 'react-native';
import type { LatLng } from '@/api/types';
import { safeOpenUrl } from './safeOpenUrl';

function isValidCoord({ lat, lng }: LatLng): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** Opens turn-by-turn directions in Apple Maps (iOS) or Google Maps (Android / web). */
export function openDirections(dest: LatLng, label?: string): Promise<boolean> {
  if (!isValidCoord(dest)) return Promise.resolve(false);
  const ll = `${dest.lat},${dest.lng}`;
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${ll}${label ? `&q=${encodeURIComponent(label)}` : ''}`
      : `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
  return safeOpenUrl(url);
}
