import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

import type { LiveMapProps, MapPin } from './live-map';

// react-native-maps has no web build, so the website uses MapLibre GL with OpenFreeMap's clean
// vector styles (free, no API key, commercial use allowed), loaded from a CDN on first use.
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl';
const STYLE = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
let libPromise: Promise<any> | null = null;

function loadMapLibre(): Promise<any> {
  const w = window as any;
  if (w.maplibregl) return Promise.resolve(w.maplibregl);
  libPromise ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${MAPLIBRE}.css`;
    document.head.appendChild(css);
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pb-pulse { 0% { transform: scale(.6); opacity: .5 } 100% { transform: scale(2.3); opacity: 0 } }
      .pb-halo { position:absolute; inset:0; border-radius:50%; background:#FF4F12; animation: pb-pulse 1.8s ease-out infinite }
      .maplibregl-ctrl-attrib { font-size: 10px }
      .maplibregl-ctrl-group { border-radius: 12px !important; box-shadow: 0 2px 10px rgba(0,0,0,.15) !important; }`;
    document.head.appendChild(style);
    const js = document.createElement('script');
    js.src = `${MAPLIBRE}.js`;
    js.onload = () => resolve(w.maplibregl);
    js.onerror = () => {
      libPromise = null;
      reject(new Error('Map failed to load'));
    };
    document.head.appendChild(js);
  });
  return libPromise;
}

const HOUSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z"/></svg>';
const TRUCK =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M3 6h11v9H3zM14 9h4l3 3.5V15h-7zM6.5 19a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zm11 0a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zM2 15h20v1.6H2z"/></svg>';
const SNOW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M11 2h2v20h-2zM2 11h20v2H2zM4.2 5.6l1.4-1.4 14.2 14.2-1.4 1.4zM18.4 4.2l1.4 1.4L5.6 19.8l-1.4-1.4z"/></svg>';

function markerElement(kind: MapPin['kind'], dark: boolean, title?: string) {
  const el = document.createElement('div');
  if (title) el.title = title;
  el.style.cursor = 'pointer';
  if (kind === 'driver')
    el.innerHTML = `<div style="position:relative;width:44px;height:44px"><div class="pb-halo"></div><div style="position:absolute;inset:4px;border-radius:50%;background:#FF4F12;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">${TRUCK}</div></div>`;
  else if (kind === 'home')
    el.innerHTML = `<div style="width:38px;height:38px;border-radius:10px;background:${dark ? '#fff' : '#0A0A0A'};color:${dark ? '#0A0A0A' : '#fff'};border:3px solid ${dark ? '#0A0A0A' : '#fff'};box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">${HOUSE}</div>`;
  else
    el.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:#0A0A0A;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">${SNOW}</div>`;
  return el;
}

type MapState = { lib: any; map: any; ready: boolean; markers: Map<string, any>; routeKey: string; fitKey: string; dark: boolean; observer?: ResizeObserver };

// Glide a marker to its new position instead of jumping (GPS fixes arrive every few seconds).
function glide(marker: any, to: [number, number]) {
  const from = marker.getLngLat();
  const start = performance.now();
  cancelAnimationFrame(marker._pbFrame);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1200);
    const e = t * (2 - t);
    marker.setLngLat([from.lng + (to[1] - from.lng) * e, from.lat + (to[0] - from.lat) * e]);
    if (t < 1) marker._pbFrame = requestAnimationFrame(step);
  };
  marker._pbFrame = requestAnimationFrame(step);
}

function sync(state: MapState, props: LiveMapProps) {
  const { lib, map } = state;
  const { pins, route, fitPadding, onPinPress } = props;
  const seen = new Set<string>();
  for (const p of pins) {
    seen.add(p.id);
    const existing = state.markers.get(p.id);
    if (existing) {
      glide(existing, [p.lat, p.lng]);
      continue;
    }
    const el = markerElement(p.kind, state.dark, p.title);
    el.addEventListener('click', () => onPinPress?.(p.id));
    state.markers.set(p.id, new lib.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map));
  }
  for (const [id, m] of state.markers) {
    if (!seen.has(id)) {
      m.remove();
      state.markers.delete(id);
    }
  }

  // Route: a casing under a bold line, like Uber's trip line. Needs the style to have loaded.
  if (state.ready) {
    const hasRoute = !!route && route.length > 1;
    const routeKey = hasRoute ? `${route.length}:${route[0]}:${route[route.length - 1]}` : '';
    if (routeKey !== state.routeKey) {
      state.routeKey = routeKey;
      const data = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: hasRoute ? route.map(([lat, lng]) => [lng, lat]) : [] } };
      const src = map.getSource('route');
      if (src) src.setData(data);
      else {
        map.addSource('route', { type: 'geojson', data });
        const layout = { 'line-cap': 'round', 'line-join': 'round' };
        map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout, paint: { 'line-color': state.dark ? '#000' : '#fff', 'line-width': 10 } });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout, paint: { 'line-color': state.dark ? '#fff' : '#0A0A0A', 'line-width': 5 } });
      }
    }
  }

  // Re-frame when the pins change or a route first appears, not on every GPS tick.
  const fitKey = `${pins.map((p) => p.id).join('|')}:${route && route.length > 1 ? 'route' : ''}`;
  if (fitKey !== state.fitKey && pins.length) {
    state.fitKey = fitKey;
    const pad = fitPadding ?? { top: 48, right: 48, bottom: 48, left: 48 };
    const points: [number, number][] = [...pins.map((p) => [p.lng, p.lat] as [number, number]), ...(route ?? []).map(([lat, lng]) => [lng, lat] as [number, number])];
    if (points.length === 1) map.jumpTo({ center: points[0], zoom: 15 });
    else {
      const bounds = points.reduce((b, pt) => b.extend(pt), new lib.LngLatBounds(points[0], points[0]));
      map.fitBounds(bounds, { padding: pad, maxZoom: 16, duration: state.ready ? 600 : 0 });
    }
  }
}

export function LiveMap(props: LiveMapProps) {
  const { height = 240, rounded = true } = props;
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const el = useRef<HTMLDivElement | null>(null);
  const state = useRef<MapState | null>(null);
  // Latest props, so the async load renders current data rather than first-render data.
  const latest = useRef(props);

  useEffect(() => {
    let cancelled = false;
    loadMapLibre()
      .then((lib) => {
        if (cancelled || !el.current || state.current) return;
        const map = new lib.Map({
          container: el.current,
          style: dark ? STYLE.dark : STYLE.light,
          center: [-93.265, 44.9778],
          zoom: 11,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
        // Credits top-right (bottom edges are often under a sheet); zoom buttons only on big maps.
        map.addControl(new lib.AttributionControl({ compact: true }), 'top-right');
        if (el.current.clientWidth >= 600) map.addControl(new lib.NavigationControl({ showCompass: false }), 'bottom-right');
        const s: MapState = { lib, map, ready: false, markers: new Map(), routeKey: '', fitKey: '', dark };
        state.current = s;
        sync(s, latest.current);
        // Draw as soon as the style is ready; waiting for 'load' would also wait on every tile.
        const onReady = () => {
          if (s.ready || !map.isStyleLoaded()) return;
          s.ready = true;
          s.routeKey = '';
          s.fitKey = ''; // frame again now that the map has its real size
          map.resize();
          // Start the credits collapsed to the small (i) button.
          const attrib = el.current?.querySelector('.maplibregl-ctrl-attrib');
          attrib?.classList.remove('maplibregl-compact-show');
          attrib?.removeAttribute('open');
          sync(s, latest.current);
        };
        map.on('styledata', onReady);
        map.on('load', onReady);
        // The container often gets its final size after mount (flex layouts, sheets).
        const ro = new ResizeObserver(() => {
          map.resize();
          if (s.ready) {
            s.fitKey = '';
            sync(s, latest.current);
          }
        });
        ro.observe(el.current);
        s.observer = ro;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      state.current?.observer?.disconnect();
      state.current?.map.remove();
      state.current = null;
    };
  }, [dark]);

  // Only re-sync when a pin moves or the route changes (parents rebuild these arrays every render).
  const sig = `${props.pins.map((p) => `${p.id}@${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')}#${props.route?.length ?? 0}:${props.route?.[0] ?? ''}`;
  useEffect(() => {
    latest.current = props;
    if (state.current) sync(state.current, props);
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ height, borderRadius: rounded ? Radius.lg : 0, overflow: 'hidden', backgroundColor: theme.backgroundElement }}>
      {createElement('div', { ref: el, style: { width: '100%', height: '100%' } })}
    </View>
  );
}

export type { LiveMapProps, MapPin };
