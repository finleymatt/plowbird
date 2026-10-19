import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Radius } from '@/constants/theme';

export type MapPin = { id: string; lat: number; lng: number; kind: 'home' | 'driver' | 'job'; title?: string };

// react-native-maps has no web build, so the website uses Leaflet + OpenStreetMap,
// loaded from a CDN on first use.
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet';
let leafletPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  leafletPromise ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${LEAFLET}.css`;
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = `${LEAFLET}.js`;
    js.onload = () => resolve(w.L);
    js.onerror = () => {
      leafletPromise = null;
      reject(new Error('Map failed to load'));
    };
    document.head.appendChild(js);
  });
  return leafletPromise;
}

const COLOR = { home: '#1E5AA8', driver: '#F26B1D', job: '#0B1B2B' };
const GLYPH = { home: '🏠', driver: '🚚', job: '❄️' };

type MapState = { map: any; markers: Map<string, any>; lastIds: string };

// Add/move/remove markers to match `pins`; re-frame only when the set of pins changes.
function syncPins(L: any, state: MapState, pins: MapPin[], onPress: (id: string) => void) {
  const seen = new Set<string>();
  for (const p of pins) {
    seen.add(p.id);
    const existing = state.markers.get(p.id);
    if (existing) {
      existing.setLatLng([p.lat, p.lng]);
      continue;
    }
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:15px;background:${COLOR[p.kind]}">${GLYPH[p.kind]}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    const m = L.marker([p.lat, p.lng], { icon }).addTo(state.map);
    if (p.title) m.bindTooltip(p.title);
    m.on('click', () => onPress(p.id));
    state.markers.set(p.id, m);
  }
  for (const [id, m] of state.markers) {
    if (!seen.has(id)) {
      m.remove();
      state.markers.delete(id);
    }
  }
  const ids = pins.map((p) => p.id).join('|');
  if (ids !== state.lastIds && pins.length) {
    state.lastIds = ids;
    if (pins.length === 1) state.map.setView([pins[0].lat, pins[0].lng], 14);
    else state.map.fitBounds(pins.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
  }
}

export function LiveMap({ pins, height = 240, onPinPress }: { pins: MapPin[]; height?: number; onPinPress?: (id: string) => void }) {
  const el = useRef<HTMLDivElement | null>(null);
  const state = useRef<MapState | null>(null);
  // Latest props, so the async Leaflet load renders current data rather than first-render data.
  const latest = useRef({ pins, onPinPress });

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !el.current || state.current) return;
        const map = L.map(el.current, { zoomControl: true }).setView([44.9778, -93.265], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
        state.current = { map, markers: new Map(), lastIds: '' };
        syncPins(L, state.current, latest.current.pins, (id) => latest.current.onPinPress?.(id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      state.current?.map.remove();
      state.current = null;
    };
  }, []);

  useEffect(() => {
    latest.current = { pins, onPinPress };
    const L = (window as any).L;
    if (L && state.current) syncPins(L, state.current, pins, (id) => latest.current.onPinPress?.(id));
  }, [pins, onPinPress]);

  return (
    <View style={{ height, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#dfe7ef' }}>
      {createElement('div', { ref: el, style: { width: '100%', height: '100%' } })}
    </View>
  );
}
