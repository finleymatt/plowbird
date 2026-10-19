import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Appearance } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { MISSING_KEY_MESSAGE, STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';
import type { CardSetupParams, PaymentMethods, SavedCard } from '@/lib/types';

import type { CardSetupProps } from './card-setup';
import { OrDivider } from './social-parts';
import { Button, ErrorText, Row } from './ui';

// Loaded once, the first time a card form opens.
let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripe = () => (stripePromise ??= loadStripe(STRIPE_PUBLISHABLE_KEY!));

// Web: Apple Pay / Google Pay (Express Checkout) on top, the card form below. Both save a payment
// method through a SetupIntent; we charge it after the plow, like any saved card.
export function CardSetup({ title, onSaved, autoOpen }: CardSetupProps) {
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

  // With no card on file, show the wallet buttons straight away instead of behind a click.
  useEffect(() => {
    if (!autoOpen) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) open();
    });
    return () => {
      cancelled = true;
    };
  }, [autoOpen]);

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
      colorPrimary: theme.accent,
      colorBackground: theme.card,
      colorText: theme.text,
      colorTextSecondary: theme.textSecondary,
      colorDanger: theme.danger,
      borderRadius: `${Radius.md}px`,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', // CSS vars don't reach Stripe's iframe
    },
    rules: { '.Input': { borderColor: theme.border, boxShadow: 'none' } },
  };

  return (
    <Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
      <SetupForm
        autoOpen={autoOpen}
        onCancel={() => setClientSecret(null)}
        onSaved={(card) => {
          setClientSecret(null);
          onSaved(card);
        }}
      />
    </Elements>
  );
}

function SetupForm({ onSaved, onCancel, autoOpen }: { onSaved: (card: SavedCard) => void; onCancel: () => void; autoOpen?: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [wallets, setWallets] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same confirmation for a wallet tap or the card form: save it, then make it the default.
  const save = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      const submitted = await elements.submit();
      if (submitted.error) throw new Error(submitted.error.message ?? 'Check your payment details');
      const result = await stripe.confirmSetup({ elements, redirect: 'if_required', confirmParams: { return_url: window.location.href } });
      if (result.error) throw new Error(result.error.message ?? "Your payment method couldn't be saved");
      const res = await api<PaymentMethods>('/payments/setup/complete', { body: { setupIntentId: result.setupIntent.id } });
      if (res.card) onSaved(res.card);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <ExpressCheckoutElement
        onConfirm={save}
        onReady={({ availablePaymentMethods }) => setWallets(!!availablePaymentMethods && Object.values(availablePaymentMethods).some(Boolean))}
        options={{ buttonHeight: 48, buttonType: { applePay: 'plain', googlePay: 'plain' }, buttonTheme: { applePay: 'black' } }}
      />
      {wallets && <OrDivider />}
      <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } }} />
      <ErrorText>{error}</ErrorText>
      <Row>
        <Button title="Save card" size="md" icon="lock-closed" loading={busy} disabled={!ready} onPress={save} style={{ flex: 1 }} />
        {!autoOpen && <Button title="Cancel" size="md" kind="ghost" disabled={busy} onPress={onCancel} />}
      </Row>
    </View>
  );
}
