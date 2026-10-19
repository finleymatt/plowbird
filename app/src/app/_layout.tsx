import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StripeProvider } from '@/components/stripe-provider';
import { Toast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

function Root() {
  const { loading } = useAuth();
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={{
          ...base,
          colors: { ...base.colors, primary: c.primary, background: c.background, card: c.tabBar, text: c.text, border: c.border },
        }}>
        <AuthProvider>
          <StripeProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Root />
          </StripeProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
