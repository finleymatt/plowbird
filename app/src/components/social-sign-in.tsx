import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import type { AppConfig, Role, User } from '@/lib/types';
import { useApi } from '@/lib/use-api';

import { ErrorText, OrDivider } from './social-parts';

export type SocialSignInProps = {
  role?: Role;
  onDone: (result: { user: User; created: boolean }) => void;
};

// Native: Sign in with Apple on iOS. (Google on native needs a development build with
// @react-native-google-signin; on the website it works today.)
export function SocialSignIn({ role, onDone }: SocialSignInProps) {
  const { socialSignIn } = useAuth();
  const dark = useColorScheme() === 'dark';
  const config = useApi<AppConfig>('/config');
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appleOn = Platform.OS === 'ios' && !!config.data?.auth?.apple;
  useEffect(() => {
    if (appleOn) AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, [appleOn]);
  if (!appleOn || !available) return null;

  const signInWithApple = async () => {
    setError(null);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!cred.identityToken) throw new Error('Apple didn’t return a sign-in token');
      const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ') || undefined;
      onDone(await socialSignIn({ provider: 'apple', idToken: cred.identityToken, name, role }));
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') setError(e.message);
    }
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={999}
        style={{ width: '100%', height: 52 }}
        onPress={signInWithApple}
      />
      <ErrorText>{error}</ErrorText>
      <OrDivider />
    </View>
  );
}
