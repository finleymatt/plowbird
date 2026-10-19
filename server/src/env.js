// Load server/.env when present (STRIPE_SECRET_KEY, JWT_SECRET…). Real env vars win.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), '../.env'));
} catch {
  // No .env file: fine, everything has a dev default.
}

// Demo mode (see demo.js): on in development; in production only with DEMO_MODE=1.
export const DEMO = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === '1';
