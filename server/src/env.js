// Load server/.env when present (STRIPE_SECRET_KEY, JWT_SECRET…). Real env vars win.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), '../.env'));
} catch {
  // No .env file: fine, everything has a dev default.
}
