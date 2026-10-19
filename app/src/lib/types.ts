export type Role = 'customer' | 'driver';

export type User = {
  id: number;
  role: Role;
  name: string;
  email: string;
  phone: string | null;
  vehicle: string | null;
  online: boolean;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  ratingCount: number;
};

export type DrivewaySize = 'single' | 'double' | 'triple' | 'large';
export type DrivewayLength = 'short' | 'standard' | 'long';

export type Property = {
  id: number;
  label: string;
  address: string;
  lat: number;
  lng: number;
  size: DrivewaySize;
  length: DrivewayLength;
  sidewalk: boolean;
  notes: string | null;
};

export type Quote = {
  lines: { label: string; cents: number }[];
  depthIn: number;
  surge: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  driverPayout: number;
};

export type JobStatus = 'scheduled' | 'requested' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

export type Job = {
  id: number;
  status: JobStatus;
  kind: 'asap' | 'scheduled' | 'storm_auto';
  scheduledFor: string | null;
  snowDepthIn: number;
  quote: Quote;
  priceCents: number;
  tipCents: number;
  paymentStatus: PaymentStatus;
  /** Card the job was charged to, e.g. "Visa •••• 4242". Null when payments are simulated. */
  cardLabel: string | null;
  rating: number | null;
  review: string | null;
  notes: string | null;
  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  property: Property;
  customer: { id: number; name: string; phone: string | null };
  driver: {
    id: number;
    name: string;
    phone: string | null;
    vehicle: string | null;
    lat: number | null;
    lng: number | null;
    rating: number | null;
    ratingCount: number;
  } | null;
  driverMiles: number | null;
  etaMinutes: number | null;
  distanceMiles?: number | null;
};

export type Alert = {
  id: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  instruction: string | null;
  ends: string | null;
};

export type SnowWindow = { inches: number; startsAt: string | null; endsAt: string | null };

export type Conditions = {
  simulated: boolean;
  location: string;
  timeZone: string;
  current: {
    station?: string;
    observedAt?: string;
    description: string;
    tempF: number | null;
    windChillF?: number | null;
    windMph: number | null;
    gustMph?: number | null;
  };
  alerts: Alert[];
  snowfall: { next24h: SnowWindow; next48h: SnowWindow };
  forecast: {
    name: string;
    startTime: string;
    isDaytime: boolean;
    tempF: number;
    wind: string;
    short: string;
    detailed: string;
    precipChance: number;
  }[];
  stormLevel: 'none' | 'light' | 'moderate' | 'significant' | 'major';
};

export type StormPlan = {
  id: number;
  property_id: number;
  threshold_in: number;
  active: boolean;
  last_triggered_at: string | null;
  address: string;
  label: string;
};

export type Earnings = {
  today: { cents: number; tips: number; jobs: number };
  week: { cents: number; tips: number; jobs: number };
  allTime: { cents: number; tips: number; jobs: number };
  recent: { id: number; address: string; completedAt: string; payoutCents: number; tipCents: number; rating: number | null }[];
};

export type PaymentStatus = 'authorized' | 'captured' | 'voided' | 'failed';

export type SavedCard = { id: string; brand: string; last4: string; expMonth: number; expYear: number; label: string };

/** 'demo' means the API has no STRIPE_SECRET_KEY and payments are status fields only. */
export type PaymentMethods = { mode: 'stripe' | 'demo'; card: SavedCard | null };

export type CardSetupParams = { customerId: string; setupIntentClientSecret: string; customerSessionClientSecret: string };

export type PayoutStatus =
  | { mode: 'demo' }
  | {
      mode: 'stripe';
      status: 'not_started' | 'incomplete' | 'pending' | 'active';
      pendingCents: number;
      paidCents: number;
      failedCents: number;
    };

export type AppNotification = { id: number; title: string; body: string; jobId: number | null; createdAt: string };

/** Road route from the driver to the driveway. `coords` are [lat, lng] pairs. */
export type JobRoute = { coords: [number, number][]; miles: number; minutes: number; arriveAt: string };

/** GET /config: server features the app adapts to. A null auth provider isn't set up. */
export type AppConfig = {
  demo: boolean;
  payments: 'stripe' | 'demo';
  auth?: { google: { webClientId: string } | null; apple: { servicesId: string | null } | null };
};
