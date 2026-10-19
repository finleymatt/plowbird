import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from './auth';

// While a driver is online, stream GPS fixes over the socket so customers see them move.
export function useDriverLocation(online: boolean) {
  const { socket } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const sub = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setPermission('denied');
        return;
      }
      setPermission('granted');
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 15 },
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          socket?.emit('location', c);
        },
      );
    })().catch(() => setPermission('denied'));
    return () => {
      cancelled = true;
      sub.current?.remove();
      sub.current = null;
    };
  }, [online, socket]);

  return { coords, permission };
}

export async function currentPosition() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
