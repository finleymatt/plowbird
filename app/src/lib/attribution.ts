import { Platform } from 'react-native';

import { storage } from './storage';

// Where a visitor came from: the utm_* and ?promo= params of the first link that brought them
// (plowbird.app/?utm_source=nextdoor&utm_campaign=launch). Saved once, on first load, and sent
// with sign-up and waitlist signups so /admin/sources can count them. First touch wins.
const KEY = 'plowbird.attribution';

export type Attribution = { utm_source?: string; utm_medium?: string; utm_campaign?: string; promo?: string };

let pending: Promise<Attribution | null> | null = null;

/** Call once at startup. Web only: native installs come from the stores, not links. */
export function captureAttribution() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  pending = (async () => {
    const saved = await storage.get(KEY).catch(() => null);
    if (saved) return parse(saved);
    const q = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'promo'] as const) {
      const v = q.get(k)?.trim().slice(0, 100);
      if (v) found[k] = v;
    }
    if (!Object.keys(found).length) return null;
    await storage.set(KEY, JSON.stringify(found)).catch(() => {});
    return found;
  })();
}

function parse(s: string): Attribution | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** The saved attribution, or undefined (so it's left out of request bodies). */
export async function getAttribution(): Promise<Attribution | undefined> {
  const a = await (pending ?? storage.get(KEY).then((s) => (s ? parse(s) : null))).catch(() => null);
  return a ?? undefined;
}
