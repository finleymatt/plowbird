import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AddressSearch, type Place } from './address-search';
import { SnowScene } from './snow-scene';
import { Snowfall } from './snowfall';
import { Icon, Row, T, type IconName } from './ui';
import { WaitlistForm } from './waitlist';
import { WeatherTicker } from './weather-ticker';

const startOrder = (p: Place, promo?: string) =>
  router.push({
    pathname: '/order',
    params: { address: p.address, lat: String(p.lat), lng: String(p.lng), c: p.confirmed ? '1' : '0', ...(promo ? { promo } : {}) },
  });
const driverSignUp = () => router.push('/drive');

// Icy sky fading to snow white, behind the hero.
const SKY = Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, #D6E9FB 0%, #EEF6FF 55%, #FFFFFF 100%)' } as object) : { backgroundColor: '#E8F2FC' };

export function Brand({ size = 22 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Row gap={Spacing.two}>
      <View style={{ width: size + 12, height: size + 12, borderRadius: (size + 12) / 3, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="snow" size={size - 2} color="primaryText" />
      </View>
      <T style={[{ fontSize: size, letterSpacing: -0.6, color: theme.text }, font('800')]}>plowbird</T>
    </Row>
  );
}

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'location', title: 'Enter your address', body: 'See your price instantly.' },
  { icon: 'flash', title: 'Request a plow', body: 'A local driver accepts in minutes.' },
  { icon: 'navigate', title: 'Watch it arrive', body: 'Live map and countdown to your door.' },
];

export function Landing({ compact, promo }: { compact?: boolean; promo?: string }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = !compact && width >= 900;
  const sceneWidth = Math.max(240, wide ? Math.min(560, width * 0.42) : Math.min(width - Spacing.four * 2, 520));

  const hero = (
    <View style={{ flex: wide ? 1 : undefined, gap: Spacing.four }}>
      <T style={[{ fontSize: wide ? 68 : 42, lineHeight: wide ? 70 : 46, letterSpacing: wide ? -2.6 : -1.6 }, font('800')]}>
        Snowed in?{'\n'}
        <T style={[{ fontSize: wide ? 68 : 42, lineHeight: wide ? 70 : 46, letterSpacing: wide ? -2.6 : -1.6, color: theme.accent }, font('800')]}>We’ll plow you out.</T>
      </T>
      <T color="textSecondary" style={{ fontSize: wide ? 20 : 17, lineHeight: wide ? 29 : 25, maxWidth: 520 }}>
        A local plow truck at your driveway in minutes. Minnesota & South Dakota.
      </T>
      <View style={{ maxWidth: 580 }}>
        <AddressSearch large cta={wide ? 'Get a plow' : undefined} onPick={(p) => startOrder(p, promo)} placeholder="Enter your home address" />
      </View>
      <Row gap={Spacing.four} style={{ flexWrap: 'wrap' }}>
        {['From $35', 'Pay after it’s plowed', 'Cancel free'].map((t) => (
          <Row key={t} gap={6}>
            <Icon name="checkmark-circle" size={18} color="accent" />
            <T variant="label" color="textSecondary">{t}</T>
          </Row>
        ))}
      </Row>
    </View>
  );

  const page = (
    <>
      <WeatherTicker />
      <View style={[{ width: '100%', alignItems: 'center', overflow: 'hidden' }, SKY]}>
        <Snowfall />
        <Section>
          <Row style={{ justifyContent: 'space-between', paddingVertical: Spacing.three }}>
            <Brand />
            <Pressable onPress={() => router.push('/sign-in')} accessibilityRole="button" style={{ padding: Spacing.two }}>
              <T variant="label">Sign in</T>
            </Pressable>
          </Row>
          <View
            style={{
              flexDirection: wide ? 'row' : 'column',
              alignItems: wide ? 'center' : 'stretch',
              gap: wide ? Spacing.five : Spacing.four,
              paddingTop: wide ? Spacing.five : Spacing.two,
              paddingBottom: wide ? 88 : Spacing.five,
            }}>
            {hero}
            <View style={{ alignItems: 'center' }}>
              <SnowScene width={sceneWidth} />
            </View>
          </View>
        </Section>
      </View>

      <Section>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? Spacing.five : Spacing.four, paddingVertical: wide ? 72 : Spacing.five }}>
          {STEPS.map((s, i) => (
            <Row key={s.title} gap={Spacing.three} style={{ flex: 1, alignItems: 'flex-start' }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: theme.ice, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.icon} size={24} color="accent" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="caption" color="textSecondary" style={{ fontWeight: '700', letterSpacing: 1 }}>STEP {i + 1}</T>
                <T variant="heading">{s.title}</T>
                <T color="textSecondary">{s.body}</T>
              </View>
            </Row>
          ))}
        </View>
      </Section>

      <Section>
        <View
          style={{
            flexDirection: wide ? 'row' : 'column',
            alignItems: wide ? 'center' : 'stretch',
            gap: wide ? Spacing.five : Spacing.three,
            padding: wide ? Spacing.five : Spacing.four,
            marginBottom: Spacing.four,
            borderRadius: 28,
            backgroundColor: theme.ice,
          }}>
          <View style={{ flex: wide ? 1 : undefined, gap: 4 }}>
            <Row gap={Spacing.two}>
              <Icon name="notifications" color="accent" />
              <T style={[{ fontSize: wide ? 26 : 22, letterSpacing: -0.6 }, font('800')]}>Get storm alerts + $10 off your first plow</T>
            </Row>
            <T color="textSecondary">A heads-up before big snow hits your street, and FIRSTPLOW for $10 off. No spam.</T>
          </View>
          <View style={{ flex: wide ? 1 : undefined }}>
            <WaitlistForm source="landing" inline cta="Get alerts" done="You’re on the list. Use FIRSTPLOW for $10 off your first plow." />
          </View>
        </View>
      </Section>

      <Section>
        <Pressable onPress={() => router.push('/storm-pass')} accessibilityRole="link">
          <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', gap: Spacing.four, padding: wide ? Spacing.five : Spacing.four, marginBottom: Spacing.five, borderRadius: 28, backgroundColor: theme.inverse }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="snow" size={28} color="primaryText" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <T style={[{ color: theme.inverseText, fontSize: wide ? 30 : 24, letterSpacing: -0.8 }, font('800')]}>Storm Pass: never shovel again.</T>
              <T style={{ color: theme.inverseText, opacity: 0.8, fontSize: 16, lineHeight: 23 }}>
                We plow automatically every time a storm hits your address. One flat price, from $79/month.
              </T>
            </View>
            <View style={{ backgroundColor: theme.primary, borderRadius: Radius.pill, paddingHorizontal: 22, paddingVertical: 14 }}>
              <T style={[{ color: theme.primaryText, fontSize: 16 }, font('700')]}>See Storm Pass</T>
            </View>
          </View>
        </Pressable>
      </Section>

      <View style={{ width: '100%', alignItems: 'center', borderTopWidth: 1, borderColor: theme.border }}>
        <Section>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.three, paddingVertical: Spacing.four }}>
            <Brand size={18} />
            <Pressable onPress={driverSignUp} accessibilityRole="link">
              <T variant="label" color="accent">Drive a plow? Earn with Plowbird →</T>
            </Pressable>
          </Row>
        </Section>
      </View>
    </>
  );

  if (compact) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView keyboardShouldPersistTaps="handled">{page}</ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ alignItems: 'stretch' }} keyboardShouldPersistTaps="handled">
      {page}
    </ScrollView>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: Spacing.four }}>{children}</View>;
}

