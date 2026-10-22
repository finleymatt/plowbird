import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/landing';
import { LiveMap, type MapPin } from '@/components/live-map';
import { Badge, Button, Card, Icon, Row, T, type IconName } from '@/components/ui';
import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { money } from '@/lib/format';
import { useApi } from '@/lib/use-api';

// Public preview of the driver app for recruiting: a storm-day route, open jobs and earnings.
// Sample data with real pricing and routing, from GET /api/drive/demo (server/src/driver-demo.js).

type Stop = {
  n: number;
  label: string;
  city: string;
  lat: number;
  lng: number;
  size: string;
  sidewalk: boolean;
  longDrive: boolean;
  kind: 'storm_pass' | 'on_demand';
  payoutCents: number;
  driveMiles: number;
  driveMinutes: number;
  plowMinutes: number;
  arriveAt: number;
};
type OpenJob = { id: string; label: string; lat: number; lng: number; size: string; sidewalk: boolean; depthIn: number; payoutCents: number; tipCents: number; miles: number; minutesAgo: number; scheduled: string | null };
type Demo = {
  base: { label: string; lat: number; lng: number };
  assumptions: { stormInches: number; alert: string; surge: number; mpg: number; gasPerGallonCents: number; plowMinutes: Record<string, number> };
  storm: {
    stops: Stop[];
    route: [number, number][];
    routeSource: 'roads' | 'estimate';
    totals: { stops: number; stormPass: number; grossCents: number; miles: number; driveMinutes: number; plowMinutes: number; hours: number; perHourCents: number; fuelCents: number; netCents: number; finishAt: number };
  };
  open: OpenJob[];
};

type Tab = 'storm' | 'jobs' | 'earnings';
const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'storm', label: 'Storm day route', icon: 'thunderstorm' },
  { key: 'jobs', label: 'Open jobs', icon: 'list' },
  { key: 'earnings', label: 'Earnings', icon: 'cash' },
];

const clock = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
const hrs = (min: number) => (min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`);

export default function DriverDemo() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const demo = useApi<Demo>('/drive/demo');
  const [tab, setTab] = useState<Tab>('storm');
  const [accepted, setAccepted] = useState<string[]>([]);
  const d = demo.data;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 1120, alignSelf: 'center', padding: wide ? Spacing.five : Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.replace('/')} accessibilityLabel="Plowbird home">
            <Brand />
          </Pressable>
          <Button title="Apply to drive" size="sm" onPress={() => router.push('/drive')} />
        </Row>

        <View style={{ gap: Spacing.two }}>
          <Badge label="DRIVER APP PREVIEW · SAMPLE DAY" tone="primary" icon="eye" />
          <T style={[{ fontSize: wide ? 44 : 32, lineHeight: wide ? 48 : 36, letterSpacing: -1.4 }, font('800')]}>See your day before the snow falls.</T>
          <T color="textSecondary" style={{ fontSize: wide ? 18 : 16, lineHeight: wide ? 27 : 24, maxWidth: 720 }}>
            This is what drivers see in the Plowbird app: a storm-day route we optimize for you, jobs you can grab between routes, and what lands in your bank.
            The driveways are samples in Plymouth, Wayzata and Minnetonka; the pay uses our real pricing.
          </T>
        </View>

        <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.pill, backgroundColor: on ? theme.inverse : theme.backgroundElement }}>
                <Icon name={t.icon} size={16} color={on ? 'inverseText' : 'text'} />
                <T variant="label" color={on ? 'inverseText' : 'text'}>{t.label}</T>
              </Pressable>
            );
          })}
        </Row>

        {!d ? (
          <T color="textSecondary">{demo.error ?? 'Loading the sample day…'}</T>
        ) : tab === 'storm' ? (
          <StormDay d={d} wide={wide} />
        ) : tab === 'jobs' ? (
          <OpenJobs d={d} wide={wide} accepted={accepted} onAccept={(id) => setAccepted((a) => (a.includes(id) ? a : [...a, id]))} />
        ) : (
          <Earnings d={d} accepted={accepted} />
        )}

        <Card style={{ gap: Spacing.three, flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', backgroundColor: theme.inverse, padding: Spacing.four }}>
          <View style={{ flex: 1, gap: 4 }}>
            <T style={[{ color: theme.inverseText, fontSize: 24, letterSpacing: -0.6 }, font('800')]}>Want days like this?</T>
            <T style={{ color: theme.inverseText, opacity: 0.8 }}>Apply in about 3 minutes. We call to check your insurance and plow, then you’re on the board for the first storm.</T>
          </View>
          <Button title="Apply to drive" icon="arrow-forward" onPress={() => router.push('/drive')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'primary' }) {
  return (
    <Card raised style={{ flexGrow: 1, flexBasis: 150, gap: 2 }}>
      <T variant="caption" color="textSecondary">{label}</T>
      <T color={tone === 'primary' ? 'primary' : 'text'} style={[{ fontSize: 28, letterSpacing: -1 }, font('800')]}>{value}</T>
      {sub && <T variant="caption" color="textSecondary">{sub}</T>}
    </Card>
  );
}

function StormDay({ d, wide }: { d: Demo; wide: boolean }) {
  const theme = useTheme();
  const t = d.storm.totals;
  const [focus, setFocus] = useState<number | null>(null);
  const pins: MapPin[] = [
    { id: 'base', kind: 'driver', lat: d.base.lat, lng: d.base.lng, title: d.base.label },
    ...d.storm.stops.map((s) => ({ id: String(s.n), kind: 'job' as const, lat: s.lat, lng: s.lng, label: String(s.n), accent: s.kind === 'storm_pass', title: `${s.n}. ${s.label}` })),
  ];

  return (
    <View style={{ gap: Spacing.three }}>
      <Card style={{ gap: 6, backgroundColor: `${theme.primary}14`, borderWidth: 1, borderColor: `${theme.primary}40` }}>
        <Row>
          <Icon name="warning" color="primary" />
          <T variant="label" style={{ flex: 1 }}>
            {`${d.assumptions.alert} · ${d.assumptions.stormInches}" overnight · storm pay ${d.assumptions.surge}×`}
          </T>
        </Row>
        <T variant="caption" color="textSecondary">
          The snow stops around 5:00 am. Storm Pass driveways were booked automatically overnight, plus on-demand orders. We put them in the fastest order from your
          truck; you start whenever you’re ready.
        </T>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
        <Stat label="You earn" value={money(t.grossCents)} sub="plus 100% of tips" tone="primary" />
        <Stat label="Driveways" value={String(t.stops)} sub={`${t.stormPass} Storm Pass · ${t.stops - t.stormPass} on-demand`} />
        <Stat label="Miles" value={t.miles.toFixed(1)} sub={`${hrs(t.driveMinutes)} driving`} />
        <Stat label="Time" value={`${t.hours} h`} sub={`done about ${clock(t.finishAt)}`} />
        <Stat label="Per hour" value={money(t.perHourCents)} sub="before tips and gas" />
        <Stat label="After gas" value={money(t.netCents)} sub={`~${money(t.fuelCents)} at ${d.assumptions.mpg} mpg`} />
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.three, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1.15 : undefined, width: wide ? undefined : '100%', gap: Spacing.two }}>
          <LiveMap pins={pins} route={d.storm.route} height={wide ? 520 : 340} onPinPress={(id) => setFocus(Number(id) || null)} />
          <Row gap={Spacing.three} style={{ flexWrap: 'wrap' }}>
            <Row gap={6}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.primary }} />
              <T variant="caption" color="textSecondary">Storm Pass</T>
            </Row>
            <Row gap={6}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#0A0A0A' }} />
              <T variant="caption" color="textSecondary">On-demand</T>
            </Row>
            <T variant="caption" color="textSecondary">
              {d.storm.routeSource === 'roads' ? 'Route follows real roads, timed for snowy streets.' : 'Route shown as straight lines; miles and times estimated.'}
            </T>
          </Row>
        </View>

        <Card style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: Spacing.three, borderBottomWidth: 1, borderColor: theme.border }}>
            <T variant="heading">Your route</T>
            <T variant="caption" color="textSecondary">Leave {d.base.label.replace(/^Your truck \((.+)\)$/, '$1')} · {t.stops} stops</T>
          </View>
          {d.storm.stops.map((s) => (
            <Pressable
              key={s.n}
              onPress={() => setFocus(s.n)}
              style={{ flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderBottomWidth: 1, borderColor: theme.border, backgroundColor: focus === s.n ? theme.ice : 'transparent' }}>
              <View style={{ alignItems: 'center', width: 52, gap: 2 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: s.kind === 'storm_pass' ? theme.primary : '#0A0A0A' }}>
                  <T style={[{ color: '#fff', fontSize: 12 }, font('800')]}>{s.n}</T>
                </View>
                <T variant="caption" color="textSecondary" style={{ fontSize: 11 }}>{clock(s.arriveAt)}</T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="label">{s.label}</T>
                <T variant="caption" color="textSecondary">
                  {s.size}{s.longDrive ? ' · long' : ''}{s.sidewalk ? ' + walks' : ''} · {s.driveMiles} mi, {s.driveMinutes} min drive · ~{s.plowMinutes} min plow
                </T>
                <View style={{ alignSelf: 'flex-start' }}>
                  <Badge label={s.kind === 'storm_pass' ? 'STORM PASS · AUTO-BOOKED' : 'ON-DEMAND'} tone={s.kind === 'storm_pass' ? 'primary' : 'neutral'} />
                </View>
              </View>
              <T style={[{ fontSize: 17 }, font('800')]}>{money(s.payoutCents)}</T>
            </Pressable>
          ))}
          <Row style={{ justifyContent: 'space-between', padding: Spacing.three }}>
            <T variant="label">Total</T>
            <T style={[{ fontSize: 18 }, font('800')]} color="primary">{money(t.grossCents)}</T>
          </Row>
        </Card>
      </View>

      <T variant="caption" color="textSecondary" style={{ lineHeight: 19 }}>
        Sample day. Pay is your 80% share at our current prices for {`${d.assumptions.stormInches}"`} of snow with {d.assumptions.alert} storm pay; tips are extra and
        100% yours. Plow times assume about {d.assumptions.plowMinutes.double} min for a 2-car driveway. Gas assumes {d.assumptions.mpg} mpg at{' '}
        {money(d.assumptions.gasPerGallonCents)}/gal. It assumes {d.storm.totals.stops} jobs near you in one storm, which depends on how many customers we have in your
        area while we’re launching. Real days depend on the storm and how many jobs you take.
      </T>
    </View>
  );
}

function OpenJobs({ d, wide, accepted, onAccept }: { d: Demo; wide: boolean; accepted: string[]; onAccept: (id: string) => void }) {
  const theme = useTheme();
  const pins: MapPin[] = [
    { id: 'base', kind: 'driver', lat: d.base.lat, lng: d.base.lng, title: d.base.label },
    ...d.open.map((j) => ({ id: j.id, kind: 'job' as const, lat: j.lat, lng: j.lng, title: j.label })),
  ];
  return (
    <View style={{ gap: Spacing.three }}>
      <T color="textSecondary" style={{ maxWidth: 720 }}>
        On a normal snowy evening, orders near you show up on your job board with the pay, distance and snow depth. Take the ones that fit. Nothing is assigned to
        you. (Tap Accept to try it; these are samples.)
      </T>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.three, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <LiveMap pins={pins} height={wide ? 460 : 300} />
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', gap: Spacing.two }}>
          {d.open.map((j) => {
            const on = accepted.includes(j.id);
            return (
              <Card key={j.id} raised style={{ gap: Spacing.two, borderWidth: 2, borderColor: on ? theme.success : 'transparent' }}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="label">{j.label}</T>
                    <T variant="caption" color="textSecondary">
                      {j.size}{j.sidewalk ? ' + walks' : ''} · {`${j.depthIn}"`} snow · {j.miles} mi away · {j.scheduled ? `scheduled ${j.scheduled}` : `posted ${j.minutesAgo} min ago`}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T style={[{ fontSize: 20 }, font('800')]}>{money(j.payoutCents)}</T>
                    {j.tipCents > 0 && <T variant="caption" color="success" style={font('700')}>+{money(j.tipCents)} tip</T>}
                  </View>
                </Row>
                {on ? (
                  <Row gap={6}>
                    <Icon name="checkmark-circle" color="success" />
                    <T variant="label" color="success">Accepted. In the real app you’d get directions and chat with the customer.</T>
                  </Row>
                ) : (
                  <Button title={`Accept · ${money(j.payoutCents + j.tipCents)}`} size="md" onPress={() => onAccept(j.id)} />
                )}
              </Card>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Earnings({ d, accepted }: { d: Demo; accepted: string[] }) {
  const theme = useTheme();
  const extra = d.open.filter((j) => accepted.includes(j.id)).reduce((s, j) => s + j.payoutCents + j.tipCents, 0);
  const cleanup = d.open.reduce((s, j) => s + j.payoutCents + j.tipCents, 0);
  const storm = d.storm.totals.grossCents;
  // An example winter week: one big storm, a cleanup day, and a light-snow evening.
  const week = [
    { day: 'Mon', cents: 0, note: 'No snow' },
    { day: 'Tue', cents: storm + extra, note: `Storm day: ${d.storm.totals.stops} driveways${extra ? ' + your picks' : ''}` },
    { day: 'Wed', cents: cleanup, note: `${d.open.length} on-demand jobs` },
    { day: 'Thu', cents: 0, note: 'No snow' },
    { day: 'Fri', cents: Math.round(cleanup / 2), note: 'Light snow, 2 jobs' },
    { day: 'Sat', cents: 0, note: 'No snow' },
    { day: 'Sun', cents: 0, note: 'No snow' },
  ];
  const total = week.reduce((s, w) => s + w.cents, 0);
  const max = Math.max(...week.map((w) => w.cents), 1);

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
        <Stat label="Example storm week" value={money(total)} sub="your share + tips" tone="primary" />
        <Stat label="Storm day" value={money(storm + extra)} sub={extra ? `includes ${money(extra)} you accepted` : 'from the route tab'} />
        <Stat label="Your share" value="80%" sub="of every job, plus 100% of tips" />
        <Stat label="Paid" value="Stripe" sub="to your bank after each job" />
      </View>
      <Card raised style={{ gap: Spacing.three }}>
        <T variant="heading">This week</T>
        <Row gap={Spacing.two} style={{ alignItems: 'flex-end', height: 180 }}>
          {week.map((w) => (
            <View key={w.day} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessibilityLabel={`${w.day}: ${money(w.cents)}, ${w.note}`}>
              <T variant="caption" style={font('700')}>{w.cents ? money(w.cents) : ''}</T>
              <View style={{ width: '70%', height: Math.max(4, (w.cents / max) * 130), borderRadius: 6, backgroundColor: w.cents ? theme.primary : theme.backgroundSelected }} />
              <T variant="caption" color="textSecondary">{w.day}</T>
            </View>
          ))}
        </Row>
        {week.filter((w) => w.cents).map((w) => (
          <Row key={w.day} style={{ justifyContent: 'space-between' }}>
            <T variant="caption">{w.day} · {w.note}</T>
            <T variant="caption" style={font('700')}>{money(w.cents)}</T>
          </Row>
        ))}
      </Card>
      <Card style={{ gap: Spacing.two }}>
        <T variant="heading">How pay works</T>
        {[
          'You see the payout before you accept. It never drops after you take the job.',
          'Storm pay goes up automatically during NWS warnings and busy nights.',
          'Storm Pass plows pay the same as on-demand; the customer’s subscription covers them.',
          'Tips are 100% yours, including tips added after the job.',
          'Set up payouts once (Stripe, about 5 minutes). Each job is paid to your bank after it’s done.',
        ].map((x) => (
          <Row key={x} style={{ alignItems: 'flex-start' }}>
            <Icon name="checkmark-circle" color="accent" size={18} />
            <T style={{ flex: 1, lineHeight: 22 }}>{x}</T>
          </Row>
        ))}
      </Card>
      {Platform.OS === 'web' && <T variant="caption" color="textSecondary">Example week built from the sample storm day and sample open jobs. Real weeks depend on the weather.</T>}
    </View>
  );
}
