// Stripe publishable key (pk_test_… in development). Without it, card entry is unavailable and
// the app shows a setup hint whenever the API has live payments turned on.
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;

// Apple Pay in the iOS app. Must match the merchant ID in app.json and your Apple Developer account.
export const APPLE_MERCHANT_ID = process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID?.trim() || 'merchant.app.plowbird';

export const MISSING_KEY_MESSAGE = 'Card entry needs EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in app/.env.local.';

/** SetupIntent id from its client secret (`seti_123_secret_abc` → `seti_123`). */
export const setupIntentId = (clientSecret: string) => clientSecret.split('_secret_')[0];
