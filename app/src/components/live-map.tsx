import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MapPin = { id: string; lat: number; lng: number; kind: 'home' | 'driver' | 'job'; title?: string };

const ICON = { home: 'home', driver: 'car', job: 'snow' } as const;

export function LiveMap({ pins, height = 240, onPinPress }: { pins: MapPin[]; height?: number; onPinPress?: (id: string) => void }) {
  const theme = useTheme();
  const ref = useRef<MapView>(null);
  const key = pins.map((p) => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');

  useEffect(() => {
    if (!pins.length) return;
    if (pins.length === 1) {
      ref.current?.animateToRegion({ latitude: pins[0].lat, longitude: pins[0].lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
    } else {
      ref.current?.fitToCoordinates(
        pins.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true },
      );
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = pins[0] ?? { lat: 44.9778, lng: -93.265 };
  return (
    <View style={{ height, borderRadius: Radius.lg, overflow: 'hidden' }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        initialRegion={{ latitude: first.lat, longitude: first.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.title}
            onPress={() => onPinPress?.(p.id)}>
            <View
              style={{
                backgroundColor: p.kind === 'driver' ? theme.primary : p.kind === 'home' ? theme.accent : '#0B1B2B',
                padding: 7,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: '#fff',
              }}>
              <Ionicons name={ICON[p.kind]} size={16} color="#fff" />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
