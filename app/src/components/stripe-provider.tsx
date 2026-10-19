import { StripeProvider as NativeStripeProvider, useStripe } from '@stripe/stripe-react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { useEffect, type ReactNode } from 'react';

import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';

// Expo Go needs the `/--/` separator so Stripe's redirect URLs come back to this project.
const urlScheme =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? Linking.createURL('/--/') : Linking.createURL('');

// Hand bank-authentication redirects back to the Stripe SDK.
function StripeLinks() {
  const { handleURLCallback } = useStripe();
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (url) handleURLCallback(url);
  }, [url, handleURLCallback]);
  return null;
}

export function StripeProvider({ children }: { children: ReactNode }) {
  if (!STRIPE_PUBLISHABLE_KEY) return children;
  return (
    <NativeStripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme={urlScheme}>
      <>
        <StripeLinks />
        {children}
      </>
    </NativeStripeProvider>
  );
}
