import type { StyleProp, ViewStyle } from 'react-native';
import type { LatLng, MapPin } from '@/api/types';

export interface PinsMapProps {
  pins: MapPin[];
  onOpenPin: (pin: MapPin) => void;
  userLocation?: LatLng | null;
  style?: StyleProp<ViewStyle>;
}

export interface MiniMapProps {
  location: LatLng;
  title: string;
  style?: StyleProp<ViewStyle>;
}

/** Togo bounding region (fits the whole country). */
export const TOGO_REGION = { latitude: 8.62, longitude: 0.98, latitudeDelta: 5.4, longitudeDelta: 3.2 };
