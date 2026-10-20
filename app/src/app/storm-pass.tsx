import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddressSearch } from '@/components/address-search';
import { Brand } from '@/components/landing';
import { AgreeLine } from '@/components/legal';
import { PaymentMethodCard } from '@/components/payment-method';
import { SnowScene } from '@/components/snow-scene';
import { Snowfall } from '@/components/snowfall';
import { SocialSignIn } from '@/components/social-sign-in';
import { Badge, Button, Card, ErrorText, Icon, Input, PasswordInput, Row, T, type IconName } from '@/components/ui';
import { WeatherTicker } from '@/components/weather-ticker';
import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money, when } from '@/lib/format';
import { confirmPlace, type Place } from '@/lib/places';
import type { DrivewaySize, PaymentMethods, Property, StormPass, StormPassPlans } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const SIZES: { key: DrivewaySize; title: string; sub: string; cars: number }[] = [
  { key: 'single', title: '1-car', sub: 'Single wide', cars: 1 },
  { key: 'double', title: '2-car', sub: 'Most homes', cars: 2 },
  { key: 'triple', title: '3+ car', sub: 'Wide or long', cars: 3 },
];
const HOW: { icon: IconName; title: string; body: string }[] = [
  { icon: 'cloud', title: 'A storm is forecast', body: 'We watch the National Weather Service for your exact address, 24/7.' },
  { icon: 'flash', title: 'Your plow books itself', body: 'Scheduled for right after the snow stops. You get a heads-up.' },
  { icon: 'sunny', title: 'You wake up plowed out', body: 'Track the truck live, or just sleep in. No charge per plow.' },
];
const SKY = Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, #D6E9FB 0%, #EEF6FF 60%, #FFFFFF 100%)' } as object) : { backgroundColor: '#E8F2FC' };
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

// Storm Pass: monthly subscription, plowed automatically every qualifying storm.
export default function StormPassScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { user, signUp } = useAuth();
  const customer = user?.role === 'customer';

  const plans = useApi<StormPassPlans>('/storm-pass/plans');
  const passes = useApi<StormPass[]>(customer ? '/storm-pass' : null);
  const props = useApi<Property[]>(customer ? '/properties' : null);
  const payments = useApi<PaymentMethods>(customer ? '/payments/methods' : null);

  const [size, setSize] = useState<DrivewaySize>('double');
  const [sidewalk, setSidewalk] = useState(false);
  const [propertyId, setPropertyId] = useState<number | 'new' | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<StormPass | null>(null);

  const p = plans.data;
  const price = p ? p.prices[size] + (sidewalk ? p.sidewalkCents : 0) : null;
  const covered = new Set((passes.data ?? []).map((s) => s.propertyId));
  const myProps = (props.data ?? []).filter((x) => !covered.has(x.id));
  // Saved driveway chosen (default: the first one without a pass), or a new address.
  const chosen = propertyId === 'new' ? null : (myProps.find((x) => x.id === propertyId) ?? (propertyId === null ? myProps[0] : undefined) ?? null);
  const pickProperty = (prop: Property) => {
    setPropertyId(prop.id);
    setSize(prop.size === 'large' ? 'triple' : prop.size);
    setSidewalk(prop.sidewalk);
  };

  const problem = !user
    ? !place ? 'Enter your address' : !name.trim() ? 'Enter your name' : !validEmail(email) ? 'Enter a valid email' : password.length < 8 ? 'Password needs 8+ characters' : null
    : !customer ? 'Sign in with a customer account to get Storm Pass.' : !chosen && !place ? 'Enter your address' : null;

  const start = async () => {
    if (problem) return setError(problem);
    setBusy('start');
    setError(null);
    try {
      if (!user) {
        try {
          await signUp({ role: 'customer', name: name.trim(), email: email.trim(), password });
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) throw new Error('That email already has an account. Sign in first, then come back here.');
          throw e;
        }
      }
      const pm = await api<PaymentMethods>('/payments/methods');
      if (pm.mode === 'stripe' && !pm.card) {
        payments.setData(pm);
        throw new Error('Add a card below to start your Storm Pass.');
      }
      let target: Property;
      if (chosen) {
        target = await api<Property>(`/properties/${chosen.id}`, { method: 'PATCH', body: { size, sidewalk } });
      } else {
        const exact = await confirmPlace(place!).catch(() => place!);
        target = await api<Property>('/properties', { body: { address: exact.address, lat: exact.lat, lng: exact.lng, label: 'Home', size, length: 'standard', sidewalk } });
      }
      setDone(await api<StormPass>('/storm-pass', { body: { propertyId: target.id } }));
      passes.reload();
      props.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (sub: StormPass) => {
    setBusy(`cancel-${sub.id}`);
    setError(null);
    try {
      await api(`/storm-pass/${sub.id}/cancel`, { method: 'POST' });
      passes.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const signup = (
    <Card raised style={{ gap: Spacing.three, padding: Spacing.four }}>
      {done ? (
        <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
          <Icon name="checkmark-circle" size={40} color="success" />
          <T variant="title">You’re covered ❄️</T>
          <T color="textSecondary">{done.label} · {done.address}. We’ll plow automatically every qualifying storm and text you when a plow is booked.</T>
          <Button title="Go to my account" kind="dark" onPress={() => router.replace('/customer')} />
        </View>
      ) : (
        <>
          <T variant="heading" style={{ fontSize: 20 }}>Start Storm Pass</T>

          {/* Which driveway */}
          {customer && myProps.length > 0 && (
            <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
              {myProps.map((x) => (
                <Pressable key={x.id} onPress={() => pickProperty(x)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 2, borderColor: chosen?.id === x.id ? theme.accent : theme.border, backgroundColor: chosen?.id === x.id ? theme.ice : theme.card }}>
                  <T variant="label">{x.label}</T>
                </Pressable>
              ))}
              <Pressable onPress={() => setPropertyId('new')} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 2, borderColor: propertyId === 'new' ? theme.accent : theme.border }}>
                <T variant="label">+ Another address</T>
              </Pressable>
            </Row>
          )}
          {chosen ? (
            <T variant="caption" color="textSecondary">{chosen.address}</T>
          ) : (
            <AddressSearch onPick={setPlace} placeholder="Enter your home address" />
          )}

          {/* Plan */}
          <Row gap={Spacing.two} style={{ alignItems: 'stretch' }}>
            {SIZES.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setSize(s.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: size === s.key }}
                style={{ flex: 1, alignItems: 'center', gap: 2, padding: Spacing.two, borderRadius: Radius.lg, borderWidth: 2, borderColor: size === s.key ? theme.accent : theme.border, backgroundColor: size === s.key ? theme.ice : theme.card }}>
                <Row gap={1}>
                  {Array.from({ length: s.cars }, (_, i) => (
                    <Icon key={i} name="car-sport" size={16} color={size === s.key ? 'accent' : 'textSecondary'} />
                  ))}
                </Row>
                <T style={[{ fontSize: 15 }, font('700')]}>{s.title}</T>
                <T variant="caption" color="textSecondary">{p ? `${money(p.prices[s.key])}/mo` : '…'}</T>
              </Pressable>
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T variant="label">Add sidewalk & front walk</T>
              <T variant="caption" color="textSecondary">+{p ? money(p.sidewalkCents) : '$15'}/mo</T>
            </View>
            <Switch value={sidewalk} onValueChange={setSidewalk} trackColor={{ true: theme.accent, false: theme.backgroundSelected }} thumbColor="#fff" />
          </Row>

          {/* Account */}
          {!user && (
            <View style={{ gap: Spacing.three }}>
              <SocialSignIn onDone={() => setError(null)} />
              <Input label="Name" value={name} onChangeText={setName} placeholder="First and last name" autoComplete="name" />
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
              <PasswordInput label="Create a password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" autoComplete="new-password" />
              <Pressable onPress={() => router.push('/sign-in')}>
                <T variant="caption" color="accent">Already have an account? Sign in</T>
              </Pressable>
            </View>
          )}
          {customer && payments.data?.mode === 'stripe' && <PaymentMethodCard methods={payments.data} onChange={payments.setData} />}

          <ErrorText>{error}</ErrorText>
          <Button title={price != null ? `Start Storm Pass · ${money(price)}/mo` : 'Start Storm Pass'} onPress={start} loading={busy === 'start'} />
          <T variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
            {payments.data?.mode === 'stripe' ? 'Billed monthly to your card. ' : ''}Cancel anytime. No charge per plow.
          </T>
          <AgreeLine />
        </>
      )}
    </Card>
  );

  const active = (passes.data ?? []).filter((s) => s.status !== 'cancelled');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <WeatherTicker />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing.six }}>
          <View style={[{ overflow: 'hidden' }, SKY]}>
            <Snowfall />
            <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: wide ? Spacing.five : Spacing.three }}>
              <Row style={{ justifyContent: 'space-between', paddingVertical: Spacing.three }}>
                <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Back">
                  <Brand />
                </Pressable>
                {!user && (
                  <Pressable onPress={() => router.push('/sign-in')} style={{ padding: Spacing.two }}>
                    <T variant="label">Sign in</T>
                  </Pressable>
                )}
              </Row>
              <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.five, paddingVertical: wide ? Spacing.five : Spacing.three, alignItems: wide ? 'flex-start' : 'stretch' }}>
                <View style={{ flex: wide ? 1.1 : undefined, gap: Spacing.three }}>
                  <Badge label="STORM PASS" tone="accent" icon="snow" />
                  <T style={[{ fontSize: wide ? 60 : 40, lineHeight: wide ? 62 : 44, letterSpacing: wide ? -2.4 : -1.4 }, font('800')]}>
                    Never shovel{'\n'}again.
                  </T>
                  <T color="textSecondary" style={{ fontSize: wide ? 20 : 17, lineHeight: wide ? 29 : 25, maxWidth: 520 }}>
                    Automatic plowing every time a storm hits your address, for one flat monthly price.
                  </T>
                  <Row gap={6} style={{ alignItems: 'baseline' }}>
                    <T style={[{ fontSize: 22 }, font('700')]}>from {p ? money(p.prices.single) : '$79'}</T>
                    <T color="textSecondary">/month · cancel anytime</T>
                  </Row>
                  {wide && <SnowScene width={460} />}
                </View>
                <View style={{ flex: wide ? 1 : undefined }}>{signup}</View>
              </View>
            </View>
          </View>

          <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: wide ? Spacing.five : Spacing.three, gap: Spacing.five, paddingTop: Spacing.five }}>
            {active.length > 0 && (
              <View style={{ gap: Spacing.three }}>
                <T variant="heading" style={{ fontSize: 22 }}>Your Storm Pass</T>
                {active.map((s) => (
                  <Card key={s.id} style={{ gap: Spacing.two }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T variant="label">{s.label}</T>
                      <Badge label={s.status === 'ending' ? `Ends ${when(s.endsAt)}` : 'Active'} tone={s.status === 'ending' ? 'warning' : 'success'} />
                    </Row>
                    <T variant="caption" color="textSecondary">{s.address}</T>
                    <T variant="caption" color="textSecondary">
                      {money(s.priceCents)}/mo{s.renewsAt ? ` · renews ${when(s.renewsAt)}` : ''}{s.billing === 'demo' ? ' · billing simulated' : ''}
                    </T>
                    {s.status === 'active' && (
                      <Pressable onPress={() => cancel(s)} disabled={busy === `cancel-${s.id}`} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                        <T variant="label" color="danger">{busy === `cancel-${s.id}` ? 'Cancelling…' : 'Cancel Storm Pass'}</T>
                      </Pressable>
                    )}
                  </Card>
                ))}
              </View>
            )}

            <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.four }}>
              {HOW.map((h, i) => (
                <Row key={h.title} gap={Spacing.three} style={{ flex: 1, alignItems: 'flex-start' }}>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.ice, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={h.icon} size={22} color="accent" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="caption" color="textSecondary" style={{ fontWeight: '700', letterSpacing: 1 }}>{i + 1}</T>
                    <T variant="heading">{h.title}</T>
                    <T color="textSecondary">{h.body}</T>
                  </View>
                </Row>
              ))}
            </View>

            <View style={{ gap: Spacing.three }}>
              <T variant="heading" style={{ fontSize: 22 }}>What’s covered</T>
              {(p?.eligibility ?? []).map((rule) => (
                <Row key={rule} gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
                  <Icon name={rule.startsWith('Not included') ? 'close-circle' : 'checkmark-circle'} color={rule.startsWith('Not included') ? 'textSecondary' : 'accent'} />
                  <T style={{ flex: 1, lineHeight: 23 }}>{rule}</T>
                </Row>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
