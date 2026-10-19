import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { DriverCard, KindBadge, QuoteLines, Stars, StatusBadge, StatusTimeline, TipPicker } from '@/components/job-parts';
import { LiveMap, type MapPin } from '@/components/live-map';
import { Button, Card, Divider, ErrorText, Icon, Input, Loading, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useSocketEvent } from '@/lib/auth';
import { money, when } from '@/lib/format';
import type { Job } from '@/lib/types';
import { useApi } from '@/lib/use-api';

function headline(job: Job) {
  switch (job.status) {
    case 'scheduled':
      return job.driver ? `${job.driver.name.split(' ')[0]} is booked for ${when(job.scheduledFor)}` : `Scheduled for ${when(job.scheduledFor)}`;
    case 'requested':
      return 'Finding a driver near you…';
    case 'accepted':
      return `${job.driver?.name.split(' ')[0]} accepted your job`;
    case 'en_route':
      return job.etaMinutes != null ? `Arriving in about ${job.etaMinutes} min` : 'Your driver is on the way';
    case 'in_progress':
      return 'Clearing your driveway now';
    case 'completed':
      return 'Your driveway is clear!';
    case 'cancelled':
      return 'This request was cancelled';
  }
}

// Simulated payments leave cardLabel empty, so those jobs keep the "(demo)" wording.
function paymentNote(job: Job) {
  const card = job.cardLabel;
  switch (job.paymentStatus) {
    case 'captured':
      return card ? `Charged to ${card} after completion` : 'Charged after completion (demo)';
    case 'voided':
      return card ? `No charge. The hold on ${card} was released.` : 'No charge';
    case 'failed':
      return `We couldn’t charge ${card ?? 'your card'}. Update your card in Account.`;
    default:
      return card
        ? `${money(job.priceCents + job.tipCents)} hold on ${card}. You’re charged when the job is done.`
        : 'Card authorized, charged when done (demo)';
  }
}

export default function CustomerJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, setData, error } = useApi<Job>(`/jobs/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [tip, setTip] = useState<number | null>(null);

  useSocketEvent<Job>('job', (j) => {
    if (String(j.id) === id) setData(j);
  });

  if (!job) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  const run = async (key: string, path: string, body?: object) => {
    setBusy(key);
    setActionError(null);
    try {
      setData(await api<Job>(path, { method: 'POST', body: body ?? {} }));
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const pins: MapPin[] = [{ id: 'home', kind: 'home', lat: job.property.lat, lng: job.property.lng, title: job.property.label }];
  if (job.driver?.lat != null && ['accepted', 'en_route', 'in_progress'].includes(job.status))
    pins.push({ id: 'driver', kind: 'driver', lat: job.driver.lat, lng: job.driver.lng!, title: job.driver.name });

  const canCancel = ['scheduled', 'requested', 'accepted'].includes(job.status);
  const tipValue = tip ?? job.tipCents;
  // Once the card is charged, tips can go up (as a separate charge) but not down.
  const charged = job.paymentStatus === 'captured';
  const tipChanged = tip != null && tip !== job.tipCents && !(charged && tip < job.tipCents);

  return (
    <Screen edges={[]} contentStyle={{ gap: Spacing.three }}>
      <Stack.Screen options={{ title: job.property.label }} />
      <View style={{ gap: Spacing.one }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <StatusBadge status={job.status} />
          <KindBadge job={job} />
        </Row>
        <T variant="title">{headline(job)}</T>
        <T color="textSecondary" numberOfLines={1}>
          {job.property.address}
        </T>
      </View>

      {job.status !== 'cancelled' && <StatusTimeline status={job.status} />}

      <LiveMap pins={pins} height={240} />

      {job.driver ? (
        <Card style={{ gap: Spacing.three }}>
          <DriverCard job={job} onCall={() => Linking.openURL(`tel:${job.driver!.phone}`)} />
          {job.driverMiles != null && ['accepted', 'en_route'].includes(job.status) && (
            <T variant="caption" color="textSecondary">
              {job.driverMiles} mi away{job.etaMinutes != null ? ` · ETA ~${job.etaMinutes} min` : ''}
            </T>
          )}
        </Card>
      ) : (
        job.status !== 'cancelled' && (
          <Card style={{ gap: Spacing.two }}>
            <Row>
              <Icon name="radio-outline" color="primary" />
              <T variant="heading">{job.status === 'scheduled' ? 'Waiting for a driver to claim it' : 'Alerting nearby drivers'}</T>
            </Row>
            <T variant="caption" color="textSecondary">
              {job.status === 'scheduled'
                ? 'Drivers can reserve your slot now. It opens to everyone nearby 45 minutes before your time.'
                : 'During storms it can take a little longer. Adding a tip helps your job get picked up sooner.'}
            </T>
          </Card>
        )
      )}

      {job.status === 'completed' && (
        <Card style={{ gap: Spacing.three }}>
          {job.rating ? (
            <>
              <T variant="heading">You rated {job.driver?.name.split(' ')[0]}</T>
              <Stars value={job.rating} size={24} />
              {job.review && <T color="textSecondary">“{job.review}”</T>}
            </>
          ) : (
            <>
              <T variant="heading">How did {job.driver?.name.split(' ')[0]} do?</T>
              <Stars value={stars} onChange={setStars} />
              <Input value={review} onChangeText={setReview} placeholder="Optional: anything to share?" />
              <Button title="Submit rating" size="md" disabled={!stars} loading={busy === 'rate'} onPress={() => run('rate', `/jobs/${job.id}/rate`, { stars, review: review || undefined })} />
            </>
          )}
        </Card>
      )}

      {job.status !== 'cancelled' && (
        <>
          <SectionTitle>{job.status === 'completed' ? 'Say thanks with a tip' : 'Tip'}</SectionTitle>
          <TipPicker value={tipValue} onChange={setTip} base={job.priceCents} />
          {charged && tip != null && tip < job.tipCents && (
            <T variant="caption" color="textSecondary">Your {money(job.tipCents)} tip was already charged, so it can’t be lowered.</T>
          )}
          {tipChanged && (
            <Button
              title={tip > job.tipCents ? `Send ${money(tip)} tip` : `Update tip to ${money(tip)}`}
              size="md"
              icon="heart"
              loading={busy === 'tip'}
              onPress={() => run('tip', `/jobs/${job.id}/tip`, { cents: tip }).then(() => setTip(null))}
            />
          )}
          {tipChanged && charged && job.cardLabel && (
            <T variant="caption" color="textSecondary">The extra {money(tip - job.tipCents)} is charged to {job.cardLabel} right away.</T>
          )}
        </>
      )}

      <SectionTitle>Receipt</SectionTitle>
      <Card>
        <QuoteLines quote={job.quote} tipCents={job.tipCents} />
        <Divider />
        <T variant="caption" color="textSecondary">
          {paymentNote(job)}
          {job.notes ? `\nNotes: ${job.notes}` : ''}
        </T>
      </Card>

      <ErrorText>{actionError}</ErrorText>
      {canCancel && (
        <Button title="Cancel request" kind="danger" loading={busy === 'cancel'} onPress={() => run('cancel', `/jobs/${job.id}/cancel`)} />
      )}
    </Screen>
  );
}
