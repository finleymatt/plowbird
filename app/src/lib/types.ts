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
  /** Drivers only: where their application stands (see /drive). */
  driverStatus?: DriverStatus | null;
  /** Plowbird staff (ADMIN_EMAILS on the server). */
  admin?: boolean;
};

export type DriverStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type PlowType = 'straight' | 'v' | 'wing' | 'box' | 'other';
export type Availability = 'overnight' | 'early_morning' | 'weekdays' | 'weekends';
export type DriverApplicationForm = {
  phone: string;
  zip: string;
  radiusMiles: number;
  truck: string;
  plowType: PlowType;
  plowWidthFt: number | null;
  insured: boolean;
  insuranceCarrier: string | null;
  yearsPlowing: number;
  availability: Availability[];
  shovel: boolean;
  notes: string | null;
  heardFrom: string | null;
  submittedAt?: string;
};
export type DriverApplication = { status: DriverStatus; application: DriverApplicationForm | null; note: string | null; reviewedAt: string | null };
export type DriverForReview = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: DriverStatus;
  application: DriverApplicationForm | null;
  note: string | null;
  reviewedAt: string | null;
  createdAt: string;
  completedJobs: number;
  rating: number | null;
};
export type AdminSummary = {
  customers: number;
  customersThisWeek: number;
  drivers: Record<DriverStatus, number>;
  driversOnline: number;
  jobs: Partial<Record<string, number>>;
  jobsThisWeek: number;
  promoRedemptions: number;
  stormPasses: number;
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
  /** Set when a promo code is applied: `total` already has it taken off. */
  promo?: { code: string; label: string; cents: number };
  totalBeforeDiscount?: number;
  /** Why the promo code sent with the quote request wasn't applied. */
  promoError?: string;
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
  /** Booked by Storm Pass: no charge to the customer. */
  covered: boolean;
  /** Promo code used on this job; discountCents is already taken off priceCents. */
  promoCode: string | null;
  discountCents: number;
  rating: number | null;
  review: string | null;
  notes: string | null;
  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  property: Property;
  /** No phone numbers for either side: they talk through in-app chat. */
  customer: { id: number; name: string };
  driver: {
    id: number;
    name: string;
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

export type PaymentStatus = 'authorized' | 'captured' | 'voided' | 'failed' | 'covered' | 'demo';

/** A saved card, Apple Pay / Google Pay card, or Link (brand 'link': no number or expiry). */
export type SavedCard = { id: string; brand: string; last4: string; expMonth: number | null; expYear: number | null; wallet?: string | null; label: string };

/** 'demo' means the API has no STRIPE_SECRET_KEY and payments are status fields only. */
// `demo`: this server lets people order without a card (nothing is charged).
export type PaymentMethods = { mode: 'stripe' | 'demo'; card: SavedCard | null; demo?: boolean };

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

/** `kind` is only on live notifications: 'message' for a new chat message. */
export type AppNotification = { id: number; title: string; body: string; jobId: number | null; createdAt: string; kind?: 'message' };

/** A chat message between a job's customer and its driver. */
export type ChatMessage = { id: number; jobId: number; senderId: number; body: string; createdAt: string; readAt: string | null };
/** GET /jobs/:id/messages. `open` is false once sending has closed (24 hours after the job is done). */
export type ChatThread = { messages: ChatMessage[]; open: boolean; unread: number };

/** Road route from the driver to the driveway. `coords` are [lat, lng] pairs. */
export type JobRoute = { coords: [number, number][]; miles: number; minutes: number; arriveAt: string };

/** GET /config: server features the app adapts to. A null auth provider isn't set up. */
export type AppConfig = {
  demo: boolean;
  payments: 'stripe' | 'demo';
  auth?: { google: { webClientId: string } | null; apple: { servicesId: string | null } | null };
};

/** GET /storm-pass/plans */
export type StormPassPlans = { name: string; prices: Record<DrivewaySize, number>; sidewalkCents: number; triggerInches: number; eligibility: string[] };

/** A customer's Storm Pass on one driveway. `ending` = cancelled, still covering until endsAt. */
export type StormPass = {
  id: number;
  propertyId: number;
  address: string;
  label: string;
  size: DrivewaySize;
  sidewalk: boolean;
  priceCents: number;
  status: 'active' | 'ending' | 'cancelled';
  renewsAt: string | null;
  endsAt: string | null;
  startedAt: string;
  billing: 'stripe' | 'demo';
};
