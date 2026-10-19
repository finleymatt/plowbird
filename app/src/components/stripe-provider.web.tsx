import type { ReactNode } from 'react';

// On web, each card form loads Stripe.js and opens its own <Elements> (see card-setup.web.tsx).
export function StripeProvider({ children }: { children: ReactNode }) {
  return children;
}
