import { memo } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '@/theme';
import type { MiniMapProps } from './types';

export const MiniMap = memo(function MiniMap({ location, title, style }: MiniMapProps) {
  const theme = useTheme();
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={[styles.map, style]}
      pointerEvents="none"
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      liteMode
      userInterfaceStyle={theme.dark ? 'dark' : 'light'}
      initialRegion={{ latitude: location.lat, longitude: location.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
    >
      <Marker coordinate={{ latitude: location.lat, longitude: location.lng }} title={title} pinColor={theme.colors.brand} />
    </MapView>
  );
});

const styles = StyleSheet.create({ map: { height: 160, borderRadius: 20, overflow: 'hidden' } });
