import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { AppText } from '@/components/ui';
import { formatRating } from '@/lib/format';
import { useTheme } from '@/theme';
import { TOGO_REGION, type PinsMapProps } from './types';

/** Native Google map with pins colored by kind; tapping the callout opens the detail screen. */
export const PinsMap = memo(function PinsMap({ pins, onOpenPin, userLocation, style }: PinsMapProps) {
  const theme = useTheme();
  const markers = useMemo(
    () =>
      pins.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.location.lat, longitude: pin.location.lng }}
          pinColor={theme.colors.kind[pin.kind]}
          tracksViewChanges={false}
          onCalloutPress={() => onOpenPin(pin)}
        >
          <Callout tooltip={false} onPress={() => onOpenPin(pin)}>
            <View style={styles.callout}>
              <AppText variant="label" weight="semibold" numberOfLines={1} style={{ color: '#111111' }}>
                {pin.name}
              </AppText>
              <AppText variant="caption" style={{ color: '#555555' }}>
                ★ {formatRating(pin.rating)} · ›
              </AppText>
            </View>
          </Callout>
        </Marker>
      )),
    [pins, onOpenPin, theme.colors.kind],
  );
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={
        userLocation
          ? { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 1.2, longitudeDelta: 1.2 }
          : TOGO_REGION
      }
      showsUserLocation={!!userLocation}
      userInterfaceStyle={theme.dark ? 'dark' : 'light'}
      toolbarEnabled={false}
    >
      {markers}
    </MapView>
  );
});

const styles = StyleSheet.create({ callout: { minWidth: 140, maxWidth: 220, padding: 4 } });
