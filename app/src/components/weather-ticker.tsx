import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';

import { font } from '@/constants/theme';
import { useApi } from '@/lib/use-api';

type TickerItem = { city: string; tempF: number | null; sky: string | null; snowIn: number; alert: string | null };

const NAVY = '#0B1B2E';
const SPEED = 45; // px per second

// Stock-ticker style strip of live weather across Minnesota & South Dakota.
export function WeatherTicker() {
  const { data } = useApi<{ items: TickerItem[] }>('/weather/ticker');
  const items = data?.items ?? [];
  const [x] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!width) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: -width, duration: (width / SPEED) * 1000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }),
    );
    loop.start();
    return () => loop.stop();
  }, [width, x]);

  return (
    <View style={{ height: 36, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }} accessibilityLabel="Live weather across Minnesota and South Dakota">
      <View style={{ height: '100%', paddingHorizontal: 12, backgroundColor: '#1E6FD9', flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 1 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#7CF3B4' }} />
        <Text style={[{ color: '#fff', fontSize: 11, letterSpacing: 1.2 }, font('800')]}>LIVE WEATHER</Text>
      </View>
      {items.length > 0 ? (
        <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
          {/* Two copies back to back: when the first scrolls out, the loop restarts seamlessly. */}
          <View style={{ flexDirection: 'row' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {items.map((it) => <Item key={it.city} it={it} />)}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {items.map((it) => <Item key={`${it.city}-2`} it={it} />)}
          </View>
        </Animated.View>
      ) : (
        <Text style={[{ color: '#9FB3C8', fontSize: 13, marginLeft: 14 }, font('500')]}>Loading conditions…</Text>
      )}
    </View>
  );
}

function Item({ it }: { it: TickerItem }) {
  const snowing = it.snowIn > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, borderRightWidth: 1, borderColor: '#24364D' }}>
      <Text style={[{ color: '#fff', fontSize: 12, letterSpacing: 0.8 }, font('800')]}>{it.city.toUpperCase()}</Text>
      <Text style={[{ color: '#fff', fontSize: 13 }, font('600')]}>{it.tempF != null ? `${it.tempF}°` : '—'}</Text>
      <Text style={[{ color: snowing ? '#8EC5FF' : '#9FB3C8', fontSize: 13 }, font('700')]}>
        {snowing ? `▲ ${it.snowIn}" snow` : it.sky || 'Clear'}
      </Text>
      {it.alert && (
        <Text style={[{ color: '#FFB38F', fontSize: 12 }, font('800')]}>⚠ {it.alert.toUpperCase()}</Text>
      )}
    </View>
  );
}
