import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AddressSearch, type Place } from './address-search';
import { Button, elevation, Icon, Row, T, type IconName } from './ui';

const startOrder = (p: Place) => router.push({ pathname: '/order', params: { address: p.address, lat: String(p.lat), lng: String(p.lng) } });
const driverSignUp = () => router.push({ pathname: '/sign-up', params: { role: 'driver' } });

const ORANGE = '#FF4F12';

export function Brand({ size = 22, light }: { size?: number; light?: boolean }) {
  const theme = useTheme();
  return (
    <Row gap={Spacing.two}>
      <View style={{ width: size + 12, height: size + 12, borderRadius: (size + 12) / 3, backgroundColor: light ? '#fff' : theme.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="snow" size={size - 2} color={light ? 'primary' : 'primaryText'} />
      </View>
      <T style={[{ fontSize: size, letterSpacing: -0.6, color: light ? '#fff' : theme.text }, font('800')]}>plowbird</T>
    </Row>
  );
}

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'location', title: 'Enter your address', body: 'Pick your driveway size and see the full price instantly. No account needed to look.' },
  { icon: 'flash', title: 'Request in one tap', body: 'Plow now or first thing tomorrow. Your name and email at checkout is your whole sign-up.' },
  { icon: 'navigate', title: 'Watch it arrive', body: 'Follow your driver’s route on the map with a live ETA, then tip when you’re clear.' },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'thunderstorm', title: 'Storm auto-plow', body: 'Set a threshold like 3". When the NWS forecast crosses it, we book a plow for after the snow stops.' },
  { icon: 'calendar', title: 'Schedule ahead', body: 'Book a 6 AM clear before your commute, or any hour in the next week.' },
  { icon: 'thermometer', title: 'Live conditions', body: 'Temps, wind chill, snowfall totals and winter alerts for your exact address.' },
  { icon: 'heart', title: '100% of tips to drivers', body: 'Tip before or after the job. Every cent goes to the person in the truck.' },
];

const PRICES: [string, string, string][] = [
  ['1-car', '$35', 'Short single driveways'],
  ['2-car', '$45', 'Most homes'],
  ['3-car', '$55', 'Wide driveways'],
  ['Acreage', '$75', 'Long or rural'],
];

const CITIES = ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'St. Cloud', 'Sioux Falls', 'Rapid City', 'Brookings', 'Fargo'];

export function Landing({ compact }: { compact?: boolean }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  // Native app: a compact welcome that still starts with the address.
  if (compact) {
    return (
      <View style={{ flex: 1, backgroundColor: ORANGE }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <Brand light />
            <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.four }}>
              <T style={[{ fontSize: 46, lineHeight: 48, letterSpacing: -1.8, color: '#fff' }, font('800')]}>Snowed in?{'\n'}Plowed out.</T>
              <T style={{ color: '#fff', fontSize: 18, lineHeight: 25, opacity: 0.92 }}>Enter your address for an instant price. A local driver can be there in minutes.</T>
              <AddressSearch large onPick={startOrder} />
            </View>
            <View style={{ gap: Spacing.two }}>
              <Button title="Sign in" kind="dark" onPress={() => router.push('/sign-in')} />
              <Pressable onPress={driverSignUp} style={{ alignSelf: 'center', padding: Spacing.two }}>
                <T style={[{ color: '#fff' }, font('700')]}>Drive a plow? Earn with Plowbird →</T>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ alignItems: 'center' }} keyboardShouldPersistTaps="handled">
      {/* Hero */}
      <View style={{ width: '100%', alignItems: 'center', backgroundColor: ORANGE, paddingBottom: wide ? 96 : Spacing.six }}>
        <Section>
          <Row style={{ justifyContent: 'space-between', paddingVertical: Spacing.three }}>
            <Brand light />
            <Row gap={Spacing.two}>
              {wide && (
                <Pressable onPress={driverSignUp} style={{ paddingHorizontal: Spacing.three, paddingVertical: Spacing.two }}>
                  <T style={[{ color: '#fff' }, font('700')]}>Become a driver</T>
                </Pressable>
              )}
              <Pressable
                onPress={() => router.push('/sign-in')}
                style={({ pressed }) => ({ backgroundColor: '#fff', borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 10, opacity: pressed ? 0.85 : 1 })}>
                <T style={[{ color: '#0A0A0A' }, font('700')]}>Sign in</T>
              </Pressable>
            </Row>
          </Row>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.five, paddingTop: wide ? Spacing.six : Spacing.four, alignItems: wide ? 'center' : 'stretch' }}>
            <View style={{ flex: 1.15, gap: Spacing.four }}>
              <T style={[{ color: '#fff', fontSize: wide ? 76 : 48, lineHeight: wide ? 76 : 50, letterSpacing: wide ? -3 : -1.8 }, font('800')]}>
                Snowed in?{'\n'}Plowed out.
              </T>
              <T style={{ color: '#fff', fontSize: wide ? 21 : 18, lineHeight: wide ? 30 : 26, opacity: 0.94, maxWidth: 540 }}>
                Local plow drivers across Minnesota & South Dakota. Enter your address for an instant price.
              </T>
              <View style={{ maxWidth: 600 }}>
                <AddressSearch large cta={wide ? 'Find a plow' : undefined} onPick={startOrder} placeholder="Enter your home address" />
              </View>
              <Row gap={Spacing.four} style={{ flexWrap: 'wrap' }}>
                {['From $35', 'Pay after it’s plowed', 'Cancel free'].map((t) => (
                  <Row key={t} gap={6}>
                    <Icon name="checkmark-circle" size={18} color="primaryText" />
                    <T style={[{ color: '#fff', fontSize: 15 }, font('600')]}>{t}</T>
                  </Row>
                ))}
              </Row>
            </View>
            <View style={{ flex: wide ? 0.85 : undefined, alignItems: wide ? 'flex-end' : 'stretch' }}>
              <TrackingPreview />
            </View>
          </View>
        </Section>
      </View>

      {/* How it works */}
      <Section>
        <View style={{ paddingVertical: wide ? 96 : Spacing.six, gap: Spacing.five }}>
          <T style={[{ fontSize: wide ? 44 : 32, lineHeight: wide ? 48 : 36, letterSpacing: -1.4 }, font('800')]}>As easy as ordering dinner.</T>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.four }}>
            {STEPS.map((s, i) => (
              <View key={s.title} style={{ flex: 1, gap: Spacing.three }}>
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.icon} size={26} color="primary" />
                </View>
                <T variant="caption" color="textSecondary" style={{ fontWeight: '700', letterSpacing: 1 }}>STEP {i + 1}</T>
                <T variant="heading" style={{ fontSize: 22 }}>{s.title}</T>
                <T color="textSecondary" style={{ lineHeight: 24 }}>{s.body}</T>
              </View>
            ))}
          </View>
        </View>
      </Section>

      {/* Pricing */}
      <View style={{ width: '100%', alignItems: 'center', backgroundColor: theme.backgroundElement, paddingVertical: wide ? 96 : Spacing.six }}>
        <Section>
          <View style={{ gap: Spacing.four }}>
            <View style={{ gap: Spacing.two }}>
              <T style={[{ fontSize: wide ? 44 : 32, lineHeight: wide ? 48 : 36, letterSpacing: -1.4 }, font('800')]}>Upfront pricing.</T>
              <T color="textSecondary" style={{ fontSize: 18, lineHeight: 26, maxWidth: 620 }}>
                Priced by driveway size and snowfall. You see the total before you book. Sidewalks +$10, heavy snow +$10 to $55.
              </T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
              {PRICES.map(([name, price, sub]) => (
                <View key={name} style={[{ flexGrow: 1, flexBasis: wide ? 0 : '45%', backgroundColor: theme.card, borderRadius: Radius.lg, padding: Spacing.four, gap: 4 }, elevation(1)]}>
                  <T variant="label" color="textSecondary">{name}</T>
                  <T style={[{ fontSize: 40, lineHeight: 44, letterSpacing: -1.5 }, font('800')]}>{price}</T>
                  <T variant="caption" color="textSecondary">{sub}</T>
                </View>
              ))}
            </View>
          </View>
        </Section>
      </View>

      {/* Features */}
      <Section>
        <View style={{ paddingVertical: wide ? 96 : Spacing.six, gap: Spacing.five }}>
          <T style={[{ fontSize: wide ? 44 : 32, lineHeight: wide ? 48 : 36, letterSpacing: -1.4 }, font('800')]}>Built for real winters.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four }}>
            {FEATURES.map((f) => (
              <Row key={f.title} gap={Spacing.three} style={{ width: wide ? '47%' : '100%', alignItems: 'flex-start' }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.stormBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={f.icon} size={22} color="primary" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T variant="heading">{f.title}</T>
                  <T color="textSecondary" style={{ lineHeight: 24 }}>{f.body}</T>
                </View>
              </Row>
            ))}
          </View>
        </View>
      </Section>

      {/* Drivers */}
      <View style={{ width: '100%', alignItems: 'center', backgroundColor: theme.inverse, paddingVertical: wide ? 96 : Spacing.six }}>
        <Section>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.four, alignItems: wide ? 'center' : 'flex-start' }}>
            <View style={{ flex: 1, gap: Spacing.three }}>
              <T style={[{ color: theme.inverseText, fontSize: wide ? 44 : 32, lineHeight: wide ? 48 : 36, letterSpacing: -1.4 }, font('800')]}>Got a truck and a plow?</T>
              <T style={{ color: theme.inverseText, opacity: 0.75, fontSize: 18, lineHeight: 26, maxWidth: 560 }}>
                Go online when it snows, take jobs near you, and keep 80% of every job plus 100% of tips. Storm nights pay more.
              </T>
            </View>
            <Pressable
              onPress={driverSignUp}
              style={({ pressed }) => ({ backgroundColor: ORANGE, borderRadius: Radius.pill, paddingHorizontal: 28, paddingVertical: 16, opacity: pressed ? 0.85 : 1 })}>
              <T style={[{ color: '#fff', fontSize: 17 }, font('700')]}>Start driving</T>
            </Pressable>
          </View>
        </Section>
      </View>

      {/* Footer */}
      <Section>
        <View style={{ paddingVertical: Spacing.five, gap: Spacing.four }}>
          <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
            {CITIES.map((c) => (
              <View key={c} style={{ backgroundColor: theme.backgroundElement, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
                <T variant="caption" style={{ fontWeight: '600' }}>{c}</T>
              </View>
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two }}>
            <Brand size={18} />
            <T variant="caption" color="textSecondary">Weather: National Weather Service · Maps © OpenStreetMap</T>
          </Row>
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <View style={{ width: '100%', maxWidth: 1180, paddingHorizontal: Spacing.four }}>{children}</View>;
}

// Static preview of the live tracking sheet, as a product shot in the hero.
function TrackingPreview() {
  return (
    <View style={[{ width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 28, padding: Spacing.four, gap: Spacing.three }, elevation(2)]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T style={[{ color: '#5E5E5E', fontSize: 15 }, font('600')]}>Mike is on the way</T>
        <View style={{ backgroundColor: '#05944F1F', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
          <T style={[{ color: '#05944F', fontSize: 12 }, font('700')]}>● LIVE</T>
        </View>
      </Row>
      <T style={[{ color: '#0A0A0A', fontSize: 48, lineHeight: 50, letterSpacing: -2 }, font('800')]}>6 min</T>
      <T style={{ color: '#5E5E5E' }}>Arrives 6:42 AM · 1.4 mi away</T>
      <Row gap={6}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < 2 ? '#0A0A0A' : i === 2 ? ORANGE : '#E4E4E4' }} />
        ))}
      </Row>
      <MiniRoute />
      <Row gap={Spacing.three} style={{ backgroundColor: '#F3F3F3', borderRadius: Radius.lg, padding: Spacing.three }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
          <T style={[{ color: '#fff' }, font('700')]}>MH</T>
        </View>
        <View style={{ flex: 1 }}>
          <T style={[{ color: '#0A0A0A' }, font('700')]}>Mike Halvorson</T>
          <T style={{ color: '#5E5E5E', fontSize: 13 }}>★ 4.9 · F-250 · 8ft V-plow</T>
        </View>
      </Row>
    </View>
  );
}

// A tiny stylized route: truck → house, the visual shorthand for live tracking.
function MiniRoute() {
  return (
    <View style={{ height: 120, borderRadius: Radius.lg, backgroundColor: '#EEF0F2', overflow: 'hidden' }}>
      {[30, 70].map((top) => (
        <View key={`h${top}`} style={{ position: 'absolute', left: 0, right: 0, top, height: 8, backgroundColor: '#fff' }} />
      ))}
      {[90, 230].map((left) => (
        <View key={`v${left}`} style={{ position: 'absolute', top: 0, bottom: 0, left, width: 8, backgroundColor: '#fff' }} />
      ))}
      <View style={{ position: 'absolute', left: 52, top: 31, width: 186, height: 5, borderRadius: 3, backgroundColor: '#0A0A0A' }} />
      <View style={{ position: 'absolute', left: 231, top: 31, width: 5, height: 42, borderRadius: 3, backgroundColor: '#0A0A0A' }} />
      <View style={{ position: 'absolute', left: 36, top: 18, width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="car" size={14} color="primaryText" />
      </View>
      <View style={{ position: 'absolute', left: 218, top: 64, width: 30, height: 30, borderRadius: 9, backgroundColor: '#0A0A0A', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="home" size={13} color="primaryText" />
      </View>
    </View>
  );
}
