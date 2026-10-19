import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Appearance } from '@stripe/stripe-js';
import { useState } from 'react';
import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { MISSING_KEY_MESSAGE, STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';
import type { CardSetupParams, PaymentMethods, SavedCard } from '@/lib/types';

import type { CardSetupProps } from './card-setup';
import { Button, ErrorText, Row } from './ui';

// Loaded once, the first time a card form opens.
let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripe = () => (stripePromise ??= loadStripe(STRIPE_PUBLISHABLE_KEY!));

// Web: Stripe's Payment Element confirms a SetupIntent in the page (no redirect for cards).
export function CardSetup({ title, onSaved }: CardSetupProps) {
  const theme = useTheme();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    if (!STRIPE_PUBLISHABLE_KEY) return setError(MISSING_KEY_MESSAGE);
    setBusy(true);
    setError(null);
    try {
      const setup = await api<CardSetupParams>('/payments/setup', { method: 'POST' });
      setClientSecret(setup.setupIntentClientSecret);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!clientSecret)
    return (
      <>
        <Button title={title} size="md" kind="secondary" icon="card-outline" loading={busy} onPress={open} />
        <ErrorText>{error}</ErrorText>
      </>
    );

  const appearance: Appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: theme.primary,
      colorBackground: theme.card,
      colorText: theme.text,
      colorTextSecondary: theme.textSecondary,
      colorDanger: theme.danger,
      borderRadius: `${Radius.sm}px`,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', // CSS vars don't reach Stripe's iframe
    },
    rules: { '.Input': { borderColor: theme.border, boxShadow: 'none' } },
  };

  return (
    <Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
      <SetupForm
        onCancel={() => setClientSecret(null)}
        onSaved={(card) => {
          setClientSecret(null);
          onSaved(card);
        }}
      />
    </Elements>
  );
}

function SetupForm({ onSaved, onCancel }: { onSaved: (card: SavedCard) => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: window.location.href },
      });
      if (result.error) throw new Error(result.error.message ?? "Your card couldn't be saved");
      const res = await api<PaymentMethods>('/payments/setup/complete', { body: { setupIntentId: result.setupIntent.id } });
      if (res.card) onSaved(res.card);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } }} />
      <ErrorText>{error}</ErrorText>
      <Row>
        <Button title="Save card" size="md" icon="lock-closed" loading={busy} disabled={!ready} onPress={save} style={{ flex: 1 }} />
        <Button title="Cancel" size="md" kind="ghost" disabled={busy} onPress={onCancel} />
      </Row>
    </View>
  );
}
