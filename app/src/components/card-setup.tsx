import { useStripe } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MISSING_KEY_MESSAGE, setupIntentId, STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';
import type { CardSetupParams, PaymentMethods, SavedCard } from '@/lib/types';

import { Button, ErrorText } from './ui';

export type CardSetupProps = { title: string; onSaved: (card: SavedCard) => void };

// Native: Stripe's PaymentSheet in setup mode saves the card without charging it.
export function CardSetup({ title, onSaved }: CardSetupProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!STRIPE_PUBLISHABLE_KEY) return setError(MISSING_KEY_MESSAGE);
    setBusy(true);
    setError(null);
    try {
      const setup = await api<CardSetupParams>('/payments/setup', { method: 'POST' });
      const init = await initPaymentSheet({
        merchantDisplayName: 'Drift',
        customerId: setup.customerId,
        customerSessionClientSecret: setup.customerSessionClientSecret,
        setupIntentClientSecret: setup.setupIntentClientSecret,
        returnURL: Linking.createURL('stripe-redirect'),
        defaultBillingDetails: { name: user?.name, email: user?.email },
      });
      if (init.error) throw new Error(init.error.message);
      const shown = await presentPaymentSheet();
      if (shown.error) {
        if (shown.error.code !== 'Canceled') setError(shown.error.message);
        return;
      }
      const res = await api<PaymentMethods>('/payments/setup/complete', {
        body: { setupIntentId: setupIntentId(setup.setupIntentClientSecret) },
      });
      if (res.card) onSaved(res.card);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button title={title} size="md" kind="secondary" icon="card-outline" loading={busy} onPress={add} />
      <ErrorText>{error}</ErrorText>
    </>
  );
}
