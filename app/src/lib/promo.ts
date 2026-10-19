import { useCallback, useEffect, useState } from 'react';

import { storage } from './storage';

// A promo code from a flyer's QR link (plowbird.app/?promo=FIRSTPLOW) is kept until an order
// uses it, so it survives the hops in between: landing → order, signing in, the signed-in home.
const KEY = 'plowbird.promo';

export const cleanPromo = (code?: string | string[] | null) =>
  String((Array.isArray(code) ? code[0] : code) ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);

export const savePendingPromo = (code: string) => storage.set(KEY, code).catch(() => {});
export const clearPendingPromo = () => storage.remove(KEY).catch(() => {});

// The code to price an order with: `?promo=` if the URL has one, else the one kept from earlier.
export function usePromoCode(fromUrl?: string | string[]) {
  const initial = cleanPromo(fromUrl);
  const [code, setCode] = useState(initial);
  useEffect(() => {
    if (initial) {
      savePendingPromo(initial);
      return;
    }
    let stale = false;
    storage
      .get(KEY)
      .then((saved) => !stale && setCode((current) => current || cleanPromo(saved)))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [initial]);
  const change = useCallback((next: string) => {
    const c = cleanPromo(next);
    setCode(c);
    if (c) savePendingPromo(c);
    else clearPendingPromo();
  }, []);
  return [code, change] as const;
}
