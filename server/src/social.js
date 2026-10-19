// "Continue with Google / Apple": verify the provider's signed ID token against its published keys.
//
// Configure with env vars (comma-separated where several apps share one backend):
//   GOOGLE_CLIENT_IDS   OAuth client IDs whose tokens we accept. The first is the web client
//                       the website's Google button uses.
//   APPLE_CLIENT_IDS    Apple audiences we accept: the iOS bundle ID (com.plowbird.app), the
//                       Services ID used on the web, and host.exp.Exponent for testing in Expo Go.
//   APPLE_SERVICES_ID   The Services ID the website's Apple button uses (also in APPLE_CLIENT_IDS).
import { createRemoteJWKSet, jwtVerify } from 'jose';

const list = (v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const GOOGLE_IDS = list(process.env.GOOGLE_CLIENT_IDS);
const APPLE_IDS = list(process.env.APPLE_CLIENT_IDS);
const APPLE_SERVICES_ID = process.env.APPLE_SERVICES_ID?.trim() || null;

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleKeys = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

// What the app needs to show the buttons. Null means that provider isn't set up.
export const socialConfig = () => ({
  google: GOOGLE_IDS.length ? { webClientId: GOOGLE_IDS[0] } : null,
  apple: APPLE_IDS.length ? { servicesId: APPLE_SERVICES_ID } : null,
});

export class SocialError extends Error {}

// Returns { provider, sub, email, emailVerified, name } for a valid token, or throws SocialError.
export async function verifySocialToken(provider, idToken) {
  if (typeof idToken !== 'string' || !idToken) throw new SocialError('Missing sign-in token');
  try {
    if (provider === 'google') {
      if (!GOOGLE_IDS.length) throw new SocialError('Google sign-in isn’t set up on this server');
      const { payload } = await jwtVerify(idToken, googleKeys, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: GOOGLE_IDS });
      return { provider, sub: payload.sub, email: payload.email ?? null, emailVerified: payload.email_verified === true, name: payload.name ?? null };
    }
    if (provider === 'apple') {
      if (!APPLE_IDS.length) throw new SocialError('Apple sign-in isn’t set up on this server');
      const { payload } = await jwtVerify(idToken, appleKeys, { issuer: 'https://appleid.apple.com', audience: APPLE_IDS });
      // Apple sends the name only to the app, only on the first sign-in, so it's passed separately.
      const verified = payload.email_verified === true || payload.email_verified === 'true';
      return { provider, sub: payload.sub, email: payload.email ?? null, emailVerified: verified, name: null };
    }
  } catch (e) {
    if (e instanceof SocialError) throw e;
    throw new SocialError('That sign-in didn’t work. Please try again.');
  }
  throw new SocialError('Unknown sign-in provider');
}
