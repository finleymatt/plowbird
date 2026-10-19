import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuoteLines, Stars, TipPicker } from '@/components/job-parts';
import { LiveMap, type MapPin } from '@/components/live-map';
import { Badge, Button, Card, Divider, elevation, ErrorText, Icon, Input, Loading, Row, Screen, T, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useSocketEvent } from '@/lib/auth';
import { money, when } from '@/lib/format';
import type { Job, JobRoute } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useJobRoute } from '@/lib/use-route';

const clock = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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

// The big line at the top of the sheet, DoorDash-style.
function status(job: Job, route: JobRoute | null): { kicker: string; big: string; sub: string | null } {
  const first = job.driver?.name.split(' ')[0];
  switch (job.status) {
    case 'scheduled':
      return { kicker: 'Scheduled', big: when(job.scheduledFor), sub: job.driver ? `${first} is booked for your driveway` : 'We’ll match you with a driver before then' };
    case 'requested':
      return { kicker: 'Finding your driver', big: 'Hang tight…', sub: 'Nearby plow drivers are seeing your request now' };
    case 'accepted':
    case 'en_route': {
      const mins = route?.minutes ?? job.etaMinutes;
      const eta = route ? new Date(route.arriveAt) : mins != null ? new Date(Date.now() + mins * 60_000) : null;
      const kicker = job.status === 'accepted' ? `${first} is getting ready` : `${first} is on the way`;
      if (route && route.miles <= 0.1) return { kicker: `${first} is here`, big: 'Arriving now', sub: 'Your driver is pulling up to your driveway' };
      const left = eta ? Math.max(0, Math.round((eta.getTime() - Date.now()) / 1000)) : null;
      return {
        kicker: left != null ? `${kicker} · arriving in` : kicker,
        big: left != null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'On the way',
        sub: [eta && `Arrives ${clock(eta)}`, route ? `${route.miles} mi away` : job.driverMiles != null ? `${job.driverMiles} mi away` : null].filter(Boolean).join(' · ') || null,
      };
    }
    case 'in_progress':
      return { kicker: `${first} is plowing`, big: 'Clearing now', sub: job.startedAt ? `Started ${clock(new Date(job.startedAt))}` : null };
    case 'completed':
      return { kicker: 'Done', big: 'Driveway clear', sub: job.completedAt ? `Finished ${clock(new Date(job.completedAt))}` : null };
    case 'cancelled':
      return { kicker: 'Cancelled', big: 'No plow coming', sub: 'You weren’t charged' };
  }
}

const STEPS = ['requested', 'accepted', 'en_route', 'in_progress', 'completed'] as const;
const STEP_LABEL = ['Requested', 'Assigned', 'On the way', 'Plowing', 'Clear'];

export default function CustomerJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const { data: job, setData, error } = useApi<Job>(`/jobs/${id}`);
  const route = useJobRoute(job);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [tip, setTip] = useState<number | null>(null);
  // Re-render each minute so "Arrives 7:42" and the countdown stay fresh between GPS updates.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

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

  const pins: MapPin[] = [{ id: 'home', kind: 'home', lat: job.property.lat, lng: job.property.lng, title: 'Your driveway' }];
  const tracking = ['accepted', 'en_route', 'in_progress'].includes(job.status);
  if (job.driver?.lat != null && tracking) pins.push({ id: 'driver', kind: 'driver', lat: job.driver.lat, lng: job.driver.lng!, title: job.driver.name });

  const s = status(job, route);
  const step = STEPS.indexOf(job.status as (typeof STEPS)[number]);
  const canCancel = ['scheduled', 'requested', 'accepted'].includes(job.status);
  const tipValue = tip ?? job.tipCents;
  // Once the card is charged, tips can go up (as a separate charge) but not down.
  const charged = job.paymentStatus === 'captured';
  const tipChanged = tip != null && tip !== job.tipCents && !(charged && tip < job.tipCents);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/customer'));

  const sheet = (
    <View style={{ gap: Spacing.four }}>
      {/* ETA */}
      <View style={{ gap: Spacing.two }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="label" color="textSecondary">{s.kicker}</T>
          {job.status === 'en_route' && <LiveDot />}
        </Row>
        <T style={{ fontSize: 52, lineHeight: 56, letterSpacing: -1.6, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{s.big}</T>
        {s.sub && <T color="textSecondary">{s.sub}</T>}
        {job.status !== 'cancelled' && job.status !== 'scheduled' && <Progress step={step} />}
        {job.status !== 'cancelled' && job.status !== 'scheduled' && (
          <T variant="caption" color="textSecondary">{STEP_LABEL.map((l, i) => (i === step ? l : null)).filter(Boolean)[0] ?? ''}</T>
        )}
      </View>

      {/* Driver */}
      {job.driver && job.status !== 'cancelled' && (
        <Card style={{ gap: Spacing.three }}>
          <Row gap={Spacing.three}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.inverse, alignItems: 'center', justifyContent: 'center' }}>
              <T variant="heading" style={{ color: theme.inverseText }}>{job.driver.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="heading" numberOfLines={1}>{job.driver.name}</T>
              <T variant="caption" color="textSecondary" numberOfLines={1}>
                {job.driver.rating ? `★ ${job.driver.rating}` : 'New driver'} · {job.driver.vehicle ?? 'Plow truck'}
              </T>
            </View>
            {job.driver.phone && job.status !== 'completed' && (
              <>
                <RoundButton icon="chatbubble" label="Text driver" onPress={() => Linking.openURL(`sms:${job.driver!.phone}`)} />
                <RoundButton icon="call" label="Call driver" onPress={() => Linking.openURL(`tel:${job.driver!.phone}`)} />
              </>
            )}
          </Row>
        </Card>
      )}

      {job.status === 'requested' && (
        <Card style={{ gap: Spacing.one }}>
          <Row>
            <Icon name="radio-outline" color="primary" />
            <T variant="label">Alerting nearby drivers</T>
          </Row>
          <T variant="caption" color="textSecondary">During storms it can take a little longer. A bigger tip helps your job get picked up sooner.</T>
        </Card>
      )}

      {/* Rate */}
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
              <Input value={review} onChangeText={setReview} placeholder="Optional: anything to share?" style={{ backgroundColor: theme.background }} />
              <Button title="Submit rating" size="md" disabled={!stars} loading={busy === 'rate'} onPress={() => run('rate', `/jobs/${job.id}/rate`, { stars, review: review || undefined })} />
            </>
          )}
        </Card>
      )}

      {/* Tip: set at checkout; offered again once the driveway is clear. */}
      {job.status === 'completed' && (
        <View style={{ gap: Spacing.two }}>
          <T variant="heading">Say thanks with a tip</T>
          <TipPicker value={tipValue} onChange={setTip} base={job.priceCents} />
          <T variant="caption" color="textSecondary">100% goes to your driver.</T>
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
        </View>
      )}

      {/* Details + receipt */}
      <View style={{ gap: Spacing.two }}>
        <T variant="heading">Details</T>
        <Row gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
          <Icon name="home-outline" color="textSecondary" />
          <View style={{ flex: 1 }}>
            <T variant="label">{job.property.address}</T>
            {job.notes && <T variant="caption" color="textSecondary">{job.notes}</T>}
          </View>
        </Row>
        <Divider />
        <QuoteLines quote={job.quote} tipCents={job.tipCents} />
        <T variant="caption" color="textSecondary" style={{ marginTop: Spacing.two }}>{paymentNote(job)}</T>
      </View>

      <ErrorText>{actionError}</ErrorText>
      {canCancel && (
        <Pressable onPress={() => run('cancel', `/jobs/${job.id}/cancel`)} disabled={busy === 'cancel'} accessibilityRole="button" style={{ alignSelf: 'center', padding: Spacing.two }}>
          <T variant="label" color="danger">{busy === 'cancel' ? 'Cancelling…' : 'Cancel request'}</T>
        </Pressable>
      )}
    </View>
  );

  const map = (
    <LiveMap
      pins={pins}
      route={route?.coords}
      height="100%"
      rounded={false}
      fitPadding={wide ? { top: 80, right: 80, bottom: 80, left: 80 } : { top: 80, right: 40, bottom: 40 + Radius.xl, left: 40 }}
    />
  );

  const BackButton = (
    <Pressable
      onPress={back}
      accessibilityLabel="Back"
      style={[{ position: 'absolute', top: insets.top + 12, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }, elevation(1)]}>
      <Icon name="arrow-back" />
    </Pressable>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView style={{ width: 460, flexGrow: 0 }} contentContainerStyle={{ padding: Spacing.five, paddingTop: Spacing.four, gap: Spacing.four }}>
          <Pressable onPress={back} accessibilityLabel="Back" style={{ alignSelf: 'flex-start' }}>
            <Row>
              <Icon name="arrow-back" />
              <T variant="label">Back</T>
            </Row>
          </Pressable>
          {sheet}
        </ScrollView>
        <View style={{ flex: 1 }}>{map}</View>
      </View>
    );
  }

  // Phone: interactive map on top, the sheet tucked under its bottom edge and scrolling on its own.
  const mapHeight = Math.round(height * (tracking ? 0.5 : 0.36));
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ height: mapHeight + Radius.xl }}>{map}</View>
      <View style={{ flex: 1, marginTop: -Radius.xl }}>
        <SheetSurface>
          <ScrollView contentContainerStyle={{ padding: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six + insets.bottom }} showsVerticalScrollIndicator={false}>
            {sheet}
          </ScrollView>
        </SheetSurface>
      </View>
      {BackButton}
    </View>
  );
}

function SheetSurface({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: theme.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, overflow: 'hidden' }, elevation(2)]}>
      <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: theme.backgroundSelected, marginTop: Spacing.two }} />
      {children}
    </View>
  );
}

function Progress({ step }: { step: number }) {
  const theme = useTheme();
  return (
    <Row gap={6} style={{ marginTop: Spacing.two }}>
      {STEPS.map((k, i) => (
        <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? (i === step ? theme.primary : theme.inverse) : theme.backgroundSelected }} />
      ))}
    </Row>
  );
}

function LiveDot() {
  return <Badge label="LIVE" tone="success" icon="radio-button-on" />;
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Icon name={icon} size={18} />
    </Pressable>
  );
}
