// Pricing tuned for Upper Midwest residential plowing (MN / SD / ND).
// All amounts in cents.

const BASE_BY_SIZE = { single: 3500, double: 4500, triple: 5500, large: 7500 };
const LENGTH_FACTOR = { short: 0.85, standard: 1, long: 1.4 };
const SIDEWALK_FEE = 1000;
const SERVICE_FEE_RATE = 0.1;
export const DRIVER_SHARE = 0.8;

export const SIZE_LABELS = {
  single: '1-car',
  double: '2-car',
  triple: '3-car',
  large: 'Large / acreage',
};

function depthFee(inches) {
  if (inches <= 4) return 0;
  if (inches <= 8) return 1000;
  if (inches <= 12) return 2000;
  if (inches <= 18) return 3500;
  return 5500;
}

// Storm surge: severe NWS alerts at the property, plus demand pressure
// (open jobs per online driver) during big events.
export function surgeMultiplier({ alerts = [], openJobs = 0, onlineDrivers = 0 }) {
  const events = alerts.map((a) => a.event);
  let m = 1;
  if (events.some((e) => /Blizzard Warning|Ice Storm Warning/.test(e))) m = 1.5;
  else if (events.some((e) => /Winter Storm Warning|Heavy Snow/.test(e))) m = 1.3;
  else if (events.some((e) => /Winter Storm Watch|Winter Weather Advisory/.test(e))) m = 1.1;

  const pressure = openJobs / Math.max(onlineDrivers, 1);
  if (pressure > 4) m += 0.25;
  else if (pressure > 2) m += 0.1;
  return Math.min(Math.round(m * 100) / 100, 2);
}

export function quote(property, { depthIn = 4, surge = 1 } = {}) {
  const base = Math.round(BASE_BY_SIZE[property.size] * LENGTH_FACTOR[property.length]);
  const sidewalk = property.sidewalk ? SIDEWALK_FEE : 0;
  const depth = depthFee(depthIn);
  const beforeSurge = base + sidewalk + depth;
  const surgeAmt = Math.round(beforeSurge * (surge - 1));
  const subtotal = beforeSurge + surgeAmt;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  return {
    lines: [
      { label: `${SIZE_LABELS[property.size]} driveway (${property.length})`, cents: base },
      ...(sidewalk ? [{ label: 'Sidewalk & front walk', cents: sidewalk }] : []),
      ...(depth ? [{ label: `Heavy snow (${depthIn}")`, cents: depth }] : []),
      ...(surgeAmt ? [{ label: `Storm demand (${surge}×)`, cents: surgeAmt }] : []),
      { label: 'Service fee', cents: serviceFee },
    ],
    depthIn,
    surge,
    subtotal,
    serviceFee,
    total: subtotal + serviceFee,
    driverPayout: Math.round(subtotal * DRIVER_SHARE),
  };
}
