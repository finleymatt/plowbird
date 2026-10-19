import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AddressSearch, type Place } from './address-search';
import { Badge, Button, Card, Icon, Row, T, type IconName } from './ui';

const startOrder = (p: Place) => router.push({ pathname: '/order', params: { address: p.address, lat: String(p.lat), lng: String(p.lng) } });

export function Brand({ size = 22 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Row gap={Spacing.two}>
      <View style={{ backgroundColor: theme.primary, borderRadius: 10, padding: 6 }}>
        <Icon name="snow" size={size - 4} color="primaryText" />
      </View>
      <T style={{ fontSize: size, fontWeight: '800', letterSpacing: -0.5 }}>Plowbird</T>
    </Row>
  );
}

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'thermometer-outline', title: 'Live conditions', body: 'Current temps, wind chill, snowfall totals and NWS winter alerts for your exact address.' },
  { icon: 'calendar-outline', title: 'Schedule ahead', body: 'Book a 5 AM clear before your commute, or any time in the next week.' },
  { icon: 'flash-outline', title: 'Storm auto-plow', body: 'Set a threshold like 3". When the forecast crosses it, we book a plow for after the snow stops.' },
  { icon: 'navigate-outline', title: 'Live tracking', body: 'Watch your driver on the map with an ETA, then get a ping when you’re clear.' },
  { icon: 'heart-outline', title: 'Tip your driver', body: 'Tip before or after the job. 100% of tips go to the person in the truck.' },
  { icon: 'shield-checkmark-outline', title: 'Upfront pricing', body: 'Priced by driveway size and snow depth. You see the full price before you book.' },
];

const CITIES = ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'St. Cloud', 'Sioux Falls', 'Rapid City', 'Brookings', 'Fargo'];

export function Landing({ compact }: { compact?: boolean }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  if (compact) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, flexGrow: 1, justifyContent: 'center' }}>
          <Brand size={28} />
          <T variant="hero">Snowed in?{'\n'}Plowed out.</T>
          <T color="textSecondary">Enter your address to see your price. A local driver can be there in minutes.</T>
          <AddressSearch large onPick={startOrder} />
          <T variant="caption" color="textSecondary">Driveways from $35 · Pay after it’s plowed · Cancel free</T>
          <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
            <Button title="I already have an account" kind="secondary" onPress={() => router.push('/sign-in')} />
            <Button title="I drive a plow truck" kind="ghost" icon="car" onPress={() => router.push({ pathname: '/sign-up', params: { role: 'driver' } })} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ alignItems: 'center' }}>
      <Section>
        <Row style={{ justifyContent: 'space-between', paddingVertical: Spacing.three }}>
          <Brand />
          <Row gap={wide ? Spacing.two : 0}>
            {wide && <Button title="Drive with us" kind="ghost" size="md" icon="car" onPress={() => router.push({ pathname: '/sign-up', params: { role: 'driver' } })} />}
            <Button title="Sign in" kind="secondary" size={wide ? 'md' : 'sm'} onPress={() => router.push('/sign-in')} />
          </Row>
        </Row>
      </Section>

      <Section>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.five, paddingVertical: wide ? Spacing.six : Spacing.four, alignItems: wide ? 'center' : 'stretch' }}>
          <View style={{ flex: 1, gap: Spacing.three }}>
            <Badge label="Now serving Minnesota & South Dakota" tone="primary" icon="location" />
            <T variant="hero" style={wide ? { fontSize: 60, lineHeight: 64 } : undefined}>
              Snowed in?{'\n'}Plowed out.
            </T>
            <T style={{ fontSize: 19, lineHeight: 28 }} color="textSecondary">
              Enter your address for an instant price. A local plow driver can be there in minutes.
            </T>
            <View style={{ maxWidth: 560, marginTop: Spacing.two }}>
              <AddressSearch large onPick={startOrder} />
            </View>
            <T variant="caption" color="textSecondary">Driveways from $35 · Pay after it’s plowed · Cancel free until your driver heads out</T>
          </View>
          <View style={{ flex: wide ? 0.85 : undefined }}>
            <HeroCard />
          </View>
        </View>
      </Section>

      <Band>
        <Section>
          <T variant="title" style={{ marginBottom: Spacing.four }}>How it works</T>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.three }}>
            <Step n={1} title="Enter your address" body="Pick your driveway size and see the full price instantly. No account needed to look." />
            <Step n={2} title="Request in one tap" body="Plow now or tomorrow morning. Add your name and email at checkout. That’s your account." />
            <Step n={3} title="Track, then tip" body="Follow your driver on the map. Rate and tip when your driveway is clear." />
          </View>
        </Section>
      </Band>

      <Section>
        <View style={{ paddingVertical: Spacing.six }}>
          <T variant="title" style={{ marginBottom: Spacing.four }}>Built for real winters</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
            {FEATURES.map((f) => (
              <Card key={f.title} style={{ width: wide ? '31.5%' : '100%', gap: Spacing.two }}>
                <Icon name={f.icon} size={26} color="primary" />
                <T variant="heading">{f.title}</T>
                <T color="textSecondary">{f.body}</T>
              </Card>
            ))}
          </View>
        </View>
      </Section>

      <Band>
        <Section>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.five }}>
            <View style={{ flex: 1, gap: Spacing.three }}>
              <T variant="title">Simple, upfront pricing</T>
              <T color="textSecondary">Based on driveway size and how much snow fell. During Winter Storm and Blizzard Warnings, prices rise a little so more drivers get out on the roads.</T>
              {[
                ['1-car driveway', '$35'],
                ['2-car driveway', '$45'],
                ['3-car driveway', '$55'],
                ['Large / acreage', '$75'],
                ['Add sidewalk & front walk', '+$10'],
                ['Heavy snow (over 4")', '+$10 to $55'],
              ].map(([k, v]) => (
                <Row key={k} style={{ justifyContent: 'space-between', borderBottomWidth: 1, borderColor: theme.border, paddingVertical: Spacing.two }}>
                  <T>{k}</T>
                  <T variant="heading">{v}</T>
                </Row>
              ))}
            </View>
            <Card style={{ flex: 1, gap: Spacing.three, backgroundColor: theme.text, borderColor: theme.text }}>
              <Icon name="car" size={32} color="primary" />
              <T variant="title" style={{ color: theme.background }}>Got a truck and a plow?</T>
              <T style={{ color: theme.background, opacity: 0.8 }}>
                Go online when it snows, accept jobs near you, and keep 80% of every job plus 100% of tips. Storm nights pay more.
              </T>
              <Button title="Start driving" onPress={() => router.push({ pathname: '/sign-up', params: { role: 'driver' } })} />
            </Card>
          </View>
        </Section>
      </Band>

      <Section>
        <View style={{ paddingVertical: Spacing.six, gap: Spacing.three }}>
          <T variant="title">Where we plow</T>
          <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
            {CITIES.map((c) => (
              <Badge key={c} label={c} tone="accent" icon="location-outline" />
            ))}
          </Row>
        </View>
      </Section>

      <Section>
        <Row style={{ justifyContent: 'space-between', paddingVertical: Spacing.four, borderTopWidth: 1, borderColor: theme.border, flexWrap: 'wrap', gap: Spacing.two }}>
          <Brand size={18} />
          <T variant="caption" color="textSecondary">Weather data: National Weather Service · Maps © OpenStreetMap</T>
        </Row>
      </Section>
    </ScrollView>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <View style={{ width: '100%', maxWidth: 1120, paddingHorizontal: Spacing.four }}>{children}</View>;
}

function Band({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ width: '100%', alignItems: 'center', backgroundColor: theme.backgroundElement, paddingVertical: Spacing.six }}>{children}</View>;
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: Spacing.two }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
        <T variant="heading" color="primaryText">{n}</T>
      </View>
      <T variant="heading">{title}</T>
      <T color="textSecondary">{body}</T>
    </View>
  );
}

// Static product preview: what the tracking screen looks like mid-storm.
function HeroCard() {
  const theme = useTheme();
  return (
    <Card style={{ gap: Spacing.three, padding: Spacing.four }}>
      <View style={{ backgroundColor: theme.stormBg, borderColor: theme.stormBorder, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 4 }}>
        <Row>
          <Icon name="warning" color="primary" size={18} />
          <T variant="label" color="primary">Winter Storm Warning</T>
        </Row>
        <T variant="caption">8 to 12 inches expected through tomorrow morning</T>
      </View>
      <Row gap={Spacing.two}>
        <Stat label="Now" value="18°" sub="Feels like 4°" />
        <Stat label="Next 24 hrs" value={'9.5"'} sub="Ends 6 AM" hot />
      </Row>
      <Row gap={Spacing.three} style={{ padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.backgroundElement }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="car" color="primaryText" />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="label">Mike is on the way</T>
          <T variant="caption" color="textSecondary">F-250 · 8ft V-plow · ★ 4.9</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T variant="heading" color="primary">6 min</T>
          <T variant="caption" color="textSecondary">ETA</T>
        </View>
      </Row>
    </Card>
  );
}

function Stat({ label, value, sub, hot }: { label: string; value: string; sub: string; hot?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: hot ? theme.stormBg : theme.backgroundElement }}>
      <T variant="caption" color="textSecondary">{label}</T>
      <T variant="title" color={hot ? 'primary' : 'text'}>{value}</T>
      <T variant="caption" color="textSecondary">{sub}</T>
    </View>
  );
}
