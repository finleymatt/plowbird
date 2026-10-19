import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { View, type DimensionValue } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export type MapPin = { id: string; lat: number; lng: number; kind: 'home' | 'driver' | 'job'; title?: string };

export type LiveMapProps = {
  pins: MapPin[];
  /** Road route as [lat, lng] pairs, drawn as a bold trip line. */
  route?: [number, number][] | null;
  height?: DimensionValue;
  rounded?: boolean;
  /** Extra room around the fitted route, e.g. for a bottom sheet covering the map. */
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  onPinPress?: (id: string) => void;
};

export function LiveMap({ pins, route, height = 240, rounded = true, fitPadding, onPinPress }: LiveMapProps) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const ref = useRef<MapView>(null);
  const hasRoute = !!route && route.length > 1;
  // Re-frame when the pins change or a route first appears, not on every GPS tick.
  const fitKey = `${pins.map((p) => p.id).join('|')}:${hasRoute ? 'route' : ''}`;

  useEffect(() => {
    if (!pins.length) return;
    const points = [...pins.map((p) => ({ latitude: p.lat, longitude: p.lng })), ...(route ?? []).map(([latitude, longitude]) => ({ latitude, longitude }))];
    if (points.length === 1) {
      ref.current?.animateToRegion({ ...points[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
    } else {
      ref.current?.fitToCoordinates(points, { edgePadding: fitPadding ?? { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
    }
  }, [fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = pins[0] ?? { lat: 44.9778, lng: -93.265 };
  const coords = (route ?? []).map(([latitude, longitude]) => ({ latitude, longitude }));
  return (
    <View style={{ height, borderRadius: rounded ? Radius.lg : 0, overflow: 'hidden', backgroundColor: theme.backgroundElement }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        userInterfaceStyle={dark ? 'dark' : 'light'}
        showsPointsOfInterests={false}
        showsBuildings={false}
        initialRegion={{ latitude: first.lat, longitude: first.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        {hasRoute && (
          <>
            <Polyline coordinates={coords} strokeColor={dark ? '#000' : '#fff'} strokeWidth={9} lineCap="round" lineJoin="round" />
            <Polyline coordinates={coords} strokeColor={dark ? '#fff' : '#0A0A0A'} strokeWidth={5} lineCap="round" lineJoin="round" />
          </>
        )}
        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.title}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={p.kind === 'driver' ? 10 : 1}
            onPress={() => onPinPress?.(p.id)}>
            {p.kind === 'home' ? (
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.inverse, borderWidth: 3, borderColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="home" size={16} color={theme.inverseText} />
              </View>
            ) : (
              <View
                style={{
                  width: p.kind === 'driver' ? 38 : 30,
                  height: p.kind === 'driver' ? 38 : 30,
                  borderRadius: 19,
                  backgroundColor: p.kind === 'driver' ? theme.primary : '#0A0A0A',
                  borderWidth: 3,
                  borderColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name={p.kind === 'driver' ? 'car' : 'snow'} size={p.kind === 'driver' ? 18 : 14} color="#fff" />
              </View>
            )}
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
