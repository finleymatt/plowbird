import { api } from './api';

/** A picked address. `confirmed` means we know it's that exact house (not just the street). */
export type Place = { address: string; lat: number; lng: number; confirmed?: boolean };

/**
 * Pin a picked address to the exact house with the US Census geocoder. Returns the canonical
 * address and precise location, or `confirmed: false` if the Census doesn't know that house number.
 */
export async function confirmPlace(place: Place): Promise<Place> {
  if (place.confirmed) return place;
  const r = await api<{ address: string; lat: number; lng: number; verified: boolean }>('/places/resolve', {
    body: { text: place.address, lat: place.lat, lng: place.lng },
  });
  return { address: r.address, lat: r.lat, lng: r.lng, confirmed: r.verified };
}
