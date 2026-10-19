import Ionicons from '@expo/vector-icons/Ionicons';
import { createElement, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { font, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import type { AppConfig } from '@/lib/types';
import { useApi } from '@/lib/use-api';

import type { SocialSignInProps } from './social-sign-in';
import { ErrorText, OrDivider } from './social-parts';

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string) {
  if (!scripts.has(src))
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
          scripts.delete(src);
          reject(new Error('Sign-in failed to load. Check your connection.'));
        };
        document.head.appendChild(s);
      }),
    );
  return scripts.get(src)!;
}

// Website: Google's own "Continue with Google" button, and Sign in with Apple JS in a popup.
export function SocialSignIn({ role, onDone }: SocialSignInProps) {
  const config = useApi<AppConfig>('/config');
  const [error, setError] = useState<string | null>(null);
  const google = config.data?.auth?.google;
  const apple = config.data?.auth?.apple;
  if (!google && !apple) return null;
  return (
    <View style={{ gap: Spacing.three }}>
      {google && <GoogleButton clientId={google.webClientId} role={role} onDone={onDone} onError={setError} />}
      {apple?.servicesId && <AppleButton servicesId={apple.servicesId} role={role} onDone={onDone} onError={setError} />}
      <ErrorText>{error}</ErrorText>
      <OrDivider />
    </View>
  );
}

type ButtonProps = SocialSignInProps & { onError: (msg: string | null) => void };

function GoogleButton({ clientId, role, onDone, onError }: ButtonProps & { clientId: string }) {
  const { socialSignIn } = useAuth();
  const dark = useColorScheme() === 'dark';
  const el = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  // Latest handlers, since Google keeps the callback from the first initialize().
  const latest = useRef({ role, onDone, onError, socialSignIn });
  useEffect(() => {
    latest.current = { role, onDone, onError, socialSignIn };
  });

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        const g = (window as any).google?.accounts?.id;
        if (cancelled || !g || !el.current) return;
        g.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: async ({ credential }: { credential: string }) => {
            const h = latest.current;
            h.onError(null);
            try {
              h.onDone(await h.socialSignIn({ provider: 'google', idToken: credential, role: h.role }));
            } catch (e: any) {
              h.onError(e.message);
            }
          },
        });
        el.current.innerHTML = '';
        g.renderButton(el.current, {
          type: 'standard',
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(400, Math.round(width)),
        });
      })
      .catch((e) => latest.current.onError(e.message));
    return () => {
      cancelled = true;
    };
  }, [clientId, dark, width]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ minHeight: 44, alignItems: 'center' }}>
      {createElement('div', { ref: el })}
    </View>
  );
}

function AppleButton({ servicesId, role, onDone, onError }: ButtonProps & { servicesId: string }) {
  const { socialSignIn } = useAuth();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    onError(null);
    try {
      await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js');
      const AppleID = (window as any).AppleID;
      AppleID.auth.init({ clientId: servicesId, scope: 'name email', redirectURI: `${window.location.origin}/`, usePopup: true });
      const r = await AppleID.auth.signIn();
      const n = r.user?.name;
      const name = n ? [n.firstName, n.lastName].filter(Boolean).join(' ') : undefined;
      onDone(await socialSignIn({ provider: 'apple', idToken: r.authorization.id_token, name, role }));
    } catch (e: any) {
      // Closing the popup isn't an error worth showing.
      if (e?.error !== 'popup_closed_by_user' && e?.error !== 'user_cancelled_authorize') onError(e?.message ?? 'Apple sign-in didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={signIn}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      style={({ pressed }) => ({
        height: 44,
        borderRadius: Radius.pill,
        backgroundColor: theme.inverse,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        alignSelf: 'center',
        width: '100%',
        maxWidth: 400,
        opacity: pressed || busy ? 0.8 : 1,
      })}>
      <Ionicons name="logo-apple" size={18} color={theme.inverseText} />
      <Text style={[{ color: theme.inverseText, fontSize: 15 }, font('600')]}>Continue with Apple</Text>
    </Pressable>
  );
}
