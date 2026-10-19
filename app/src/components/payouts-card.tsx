import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { moneyExact } from '@/lib/format';
import type { PayoutStatus } from '@/lib/types';
import { useApi } from '@/lib/use-api';

import { Badge, Button, Card, ErrorText, Icon, Row, T } from './ui';

const COPY = {
  not_started: {
    title: 'Set up payouts',
    body: 'Add your bank account with Stripe to get paid for every job. Takes about 5 minutes.',
    action: 'Set up payouts',
  },
  incomplete: { title: 'Finish payout setup', body: 'Stripe needs a few more details before it can pay you.', action: 'Finish setup' },
  pending: { title: 'Verifying your details', body: 'Stripe is reviewing your info. This usually takes a few minutes.', action: 'Review details' },
  active: { title: 'Payouts are on', body: 'Your earnings and tips go to your bank through Stripe after each job.', action: null },
} as const;

// Earnings tab: Stripe Connect Express onboarding and status for drivers.
export function PayoutsCard() {
  const { data, reload } = useApi<PayoutStatus>('/driver/payouts');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;
  if (data.mode === 'demo')
    return (
      <T variant="caption" color="textSecondary" style={{ marginTop: Spacing.two }}>
        You keep 80% of every job and 100% of tips. Payouts are simulated in this build.
      </T>
    );

  // Stripe only redirects to http(s); the API bounces app deep links back for us.
  const returnUrl = Platform.OS === 'web' ? window.location.href : Linking.createURL('/driver/earnings');

  const openStripe = async (page: 'onboard' | 'dashboard') => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>(`/driver/payouts/${page}`, { body: page === 'onboard' ? { returnUrl } : {} });
      if (Platform.OS === 'web') {
        // Onboarding in the same tab: Stripe sends the driver straight back to this page.
        if (page === 'onboard') window.location.assign(url);
        else window.open(url, '_blank', 'noopener');
        return;
      }
      if (page === 'onboard') await WebBrowser.openAuthSessionAsync(url, returnUrl);
      else await WebBrowser.openBrowserAsync(url);
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = COPY[data.status];

  return (
    <Card style={{ marginTop: Spacing.three, gap: Spacing.two }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Icon name={data.status === 'active' ? 'checkmark-circle' : 'wallet-outline'} color={data.status === 'active' ? 'success' : 'primary'} />
          <T variant="heading">{copy.title}</T>
        </Row>
        {data.status === 'active' && <Badge label="Stripe" tone="success" />}
      </Row>
      <T variant="caption" color="textSecondary">
        {copy.body} You keep 80% of every job and 100% of tips.
      </T>
      {data.pendingCents > 0 && (
        <T variant="label" color="warning">
          {moneyExact(data.pendingCents)} is waiting for you. It’s sent as soon as setup is done.
        </T>
      )}
      {data.failedCents > 0 && (
        <T variant="label" color="danger">
          {moneyExact(data.failedCents)} couldn’t be sent. Contact Plowbird support.
        </T>
      )}
      <View style={{ gap: Spacing.two, marginTop: Spacing.one }}>
        {copy.action && (
          <Button title={copy.action} size="md" icon="open-outline" loading={busy} onPress={() => openStripe('onboard')} />
        )}
        {(data.status === 'active' || data.status === 'pending') && (
          <Button title="Open Stripe dashboard" size="md" kind="secondary" icon="stats-chart" disabled={busy} onPress={() => openStripe('dashboard')} />
        )}
      </View>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
