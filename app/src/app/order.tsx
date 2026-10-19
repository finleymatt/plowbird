import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressSearch } from '@/components/address-search';
import { QuoteLines, TipPicker } from '@/components/job-parts';
import { Brand } from '@/components/landing';
import { LiveMap } from '@/components/live-map';
import { PaymentMethodCard } from '@/components/payment-method';
import { SocialSignIn } from '@/components/social-sign-in';
import { Button, Card, elevation, ErrorText, Icon, Input, PasswordInput, Row, T, type IconName } from '@/components/ui';
import { WeatherTicker } from '@/components/weather-ticker';
import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';
import { confirmPlace, type Place } from '@/lib/places';
import type { Conditions, DrivewaySize, Job, PaymentMethods, Property, Quote } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const DEPTHS = [2, 4, 6, 8, 12, 18];
const nearestDepth = (inches: number) => DEPTHS.reduce((best, d) => (Math.abs(d - inches) < Math.abs(best - inches) ? d : best), 4);
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

const SIZES: { key: DrivewaySize; title: string; sub: string; icon: IconName; cars: number }[] = [
  { key: 'single', title: '1-car', sub: 'Single wide', icon: 'car-sport', cars: 1 },
  { key: 'double', title: '2-car', sub: 'Most homes', icon: 'car-sport', cars: 2 },
  { key: 'triple', title: '3+ car', sub: 'Wide or long', icon: 'car-sport', cars: 3 },
];

// Checkout, DoorDash-style: address, driveway size, price, request. Everything else is defaulted
// (ASAP, standard length, snow depth from the forecast) or tucked behind a link.
export default function Order() {
  const params = useLocalSearchParams<{ address?: string; lat?: string; lng?: string; c?: string }>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const insets = useSafeAreaInsets();
  const { user, signUp, signIn } = useAuth();

  const [place, setPlace] = useState<Place | null>(
    params.address && params.lat && params.lng
      ? { address: params.address, lat: Number(params.lat), lng: Number(params.lng), confirmed: params.c === '1' }
      : null,
  );
  // Pin the exact house in the background; warn (don't block) if the Census doesn't know it.
  const [unconfirmed, setUnconfirmed] = useState(false);
  useEffect(() => {
    if (!place || place.confirmed) return;
    let stale = false;
    confirmPlace(place)
      .then((p) => {
        if (stale) return;
        if (p.confirmed) setPlace(p);
        else setUnconfirmed(true);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [place]);

  const [size, setSize] = useState<DrivewaySize>('double');
  const [sidewalk, setSidewalk] = useState(false);
  const [tip, setTip] = useState(500);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Account, only when signed out.
  const [hasAccount, setHasAccount] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wx = useApi<Conditions>(place ? `/weather?lat=${place.lat}&lng=${place.lng}` : null);
  const payments = useApi<PaymentMethods>(user?.role === 'customer' ? '/payments/methods' : null);
  const forecastIn = wx.data?.snowfall.next24h.inches ?? 0;
  const depth = forecastIn > 0 ? nearestDepth(forecastIn) : 4;

  const [quote, setQuote] = useState<Quote | null>(null);
  useEffect(() => {
    if (!place) return;
    let stale = false;
    api<Quote>(`/quote/preview?lat=${place.lat}&lng=${place.lng}&size=${size}&length=standard&sidewalk=${sidewalk ? 1 : 0}&depth=${depth}`)
      .then((q) => !stale && setQuote(q))
      .catch((e) => !stale && setError(e.message));
    return () => {
      stale = true;
    };
  }, [place, size, sidewalk, depth]);

  const needsCard = payments.data?.mode === 'stripe' && !payments.data.card && !payments.data.demo;
  const accountProblem = user
    ? user.role !== 'customer'
      ? 'You’re signed in as a driver. Sign out to book a plow.'
      : null
    : hasAccount
      ? !validEmail(email) ? 'Enter your email' : !password ? 'Enter your password' : null
      : !name.trim() ? 'Enter your name' : !validEmail(email) ? 'Enter a valid email' : password.length < 8 ? 'Password needs 8+ characters' : null;

  const submit = async () => {
    setTouched(true);
    if (!place || !quote || accountProblem) return;
    setBusy(true);
    setError(null);
    try {
      let me = user;
      if (!me) {
        try {
          me = hasAccount
            ? await signIn(email.trim(), password)
            : await signUp({ role: 'customer', name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            setHasAccount(true);
            throw new Error('You already have an account with that email. Enter your password to sign in.');
          }
          throw e;
        }
        if (me.role !== 'customer') throw new Error('That account is a driver account. Use a different email to book a plow.');
      }
      // Live payments: the card is added once there's an account to attach it to.
      const pm = await api<PaymentMethods>('/payments/methods');
      if (pm.mode === 'stripe' && !pm.card && !pm.demo) {
        payments.setData(pm);
        throw new Error('Add a card below to finish booking. You’re only charged once your driveway is clear.');
      }
      // Reuse a saved driveway at this address, otherwise save it.
      const saved = await api<Property[]>('/properties');
      const same = saved.find((p) => p.address.toLowerCase() === place.address.toLowerCase());
      const details = { size, length: 'standard', sidewalk, notes: notes.trim() || undefined };
      const property = same
        ? await api<Property>(`/properties/${same.id}`, { method: 'PATCH', body: details })
        : await api<Property>('/properties', {
            body: { address: place.address, lat: place.lat, lng: place.lng, label: saved.length ? `Driveway ${saved.length + 1}` : 'Home', ...details },
          });
      const job = await api<Job>('/jobs', { body: { propertyId: property.id, depthIn: depth, tipCents: tip, notes: notes.trim() || undefined } });
      router.replace({ pathname: '/customer/job/[id]', params: { id: String(job.id) } });
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const total = quote ? quote.total + tip : null;
  const ctaButton = (
    <Button
      title={total != null ? `Request plow · ${money(total)}` : 'Request plow'}
      onPress={submit}
      loading={busy}
      disabled={!quote || (!!user && (user.role !== 'customer' || needsCard))}
    />
  );

  // ---- left column: where + driveway ----
  const details = place && (
    <View style={{ gap: Spacing.five, flex: wide ? 1.2 : undefined }}>
      <View style={{ gap: Spacing.three }}>
        <LiveMap pins={[{ id: 'home', kind: 'home', lat: place.lat, lng: place.lng, title: 'Your driveway' }]} height={wide ? 240 : 170} />
        <Row gap={Spacing.three}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.ice, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="home" color="accent" />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="heading" numberOfLines={2}>{place.address}</T>
            {unconfirmed && <T variant="caption" color="warning">We couldn’t confirm the house number. Double-check it.</T>}
          </View>
          <Button title="Change" size="sm" kind="secondary" onPress={() => { setPlace(null); setUnconfirmed(false); }} />
        </Row>
        {forecastIn > 0 && (
          <Row gap={Spacing.two} style={{ backgroundColor: theme.ice, borderRadius: Radius.md, padding: Spacing.three }}>
            <Icon name="snow" color="accent" />
            <T variant="label" style={{ flex: 1 }}>{`${forecastIn}" of snow forecast in the next 24 hours`}</T>
          </Row>
        )}
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="heading" style={{ fontSize: 20 }}>How big is your driveway?</T>
        <Row gap={Spacing.two} style={{ alignItems: 'stretch' }}>
          {SIZES.map((s) => (
            <SizeCard key={s.key} selected={size === s.key} onPress={() => setSize(s.key)} title={s.title} sub={s.sub} cars={s.cars} />
          ))}
        </Row>
        <Pressable onPress={() => setSidewalk((v) => !v)}>
          <Row style={{ justifyContent: 'space-between', paddingVertical: Spacing.two }}>
            <View style={{ flex: 1 }}>
              <T variant="label">Also clear the sidewalk</T>
              <T variant="caption" color="textSecondary">+$10 · many cities require it within 24 hours</T>
            </View>
            <Switch value={sidewalk} onValueChange={setSidewalk} trackColor={{ true: theme.accent, false: theme.backgroundSelected }} thumbColor="#fff" />
          </Row>
        </Pressable>
        {showNotes ? (
          <Input value={notes} onChangeText={setNotes} placeholder="Gate code, where to pile snow, cars in the driveway…" autoFocus />
        ) : (
          <Pressable onPress={() => setShowNotes(true)} style={{ alignSelf: 'flex-start' }} accessibilityRole="button">
            <T variant="label" color="accent">+ Add instructions for your driver</T>
          </Pressable>
        )}
      </View>
    </View>
  );

  // ---- right column: price, account, request ----
  const checkout = place && (
    <View style={{ gap: Spacing.four, flex: wide ? 1 : undefined }}>
      <Card raised style={{ gap: Spacing.three, padding: Spacing.four }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="heading">Your plow</T>
          <Row gap={6}>
            <Icon name="flash" size={16} color="primary" />
            <T variant="label" color="primary">ASAP</T>
          </Row>
        </Row>
        {quote ? <QuoteLines quote={quote} tipCents={tip} /> : <T color="textSecondary">Calculating…</T>}
        <T variant="caption" color="textSecondary">Tip your driver (100% goes to them)</T>
        <TipPicker value={tip} onChange={setTip} base={quote?.total ?? 4500} />
      </Card>

      {user ? (
        user.role === 'customer' && (
          <View style={{ gap: Spacing.two }}>
            <Row>
              <Icon name="person-circle" color="accent" />
              <T variant="label" style={{ flex: 1 }}>Booking as {user.name}</T>
            </Row>
            <PaymentMethodCard methods={payments.data} onChange={payments.setData} />
          </View>
        )
      ) : (
        <View style={{ gap: Spacing.three }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="heading">{hasAccount ? 'Sign in to book' : 'Your details'}</T>
            <Pressable onPress={() => setHasAccount((v) => !v)} accessibilityRole="button">
              <T variant="label" color="accent">{hasAccount ? 'New here?' : 'I have an account'}</T>
            </Pressable>
          </Row>
          <SocialSignIn onDone={() => setError(null)} />
          {!hasAccount && (
            <>
              <Input label="Name" value={name} onChangeText={setName} placeholder="First and last name" autoComplete="name" textContentType="name" invalid={touched && !name.trim()} />
              <Input label="Mobile phone" value={phone} onChangeText={setPhone} placeholder="So your driver can text you" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
            </>
          )}
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
            invalid={touched && !validEmail(email)} hint={touched && !validEmail(email) ? 'Enter a valid email' : null} />
          <PasswordInput label={hasAccount ? 'Password' : 'Create a password'} value={password} onChangeText={setPassword}
            autoComplete={hasAccount ? 'password' : 'new-password'} textContentType={hasAccount ? 'password' : 'newPassword'}
            placeholder={hasAccount ? undefined : 'At least 8 characters'} onSubmitEditing={submit}
            invalid={touched && (hasAccount ? !password : password.length < 8)}
            hint={hasAccount ? null : password ? (password.length >= 8 ? '✓ Looks good' : `${8 - password.length} more character${password.length === 7 ? '' : 's'}`) : null} />
        </View>
      )}
      <Row gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
        <Icon name="shield-checkmark" size={18} color="success" />
        <T variant="caption" color="textSecondary" style={{ flex: 1 }}>You’re only charged once your driveway is clear. Cancel free until your driver heads out.</T>
      </Row>
      <ErrorText>{error ?? (touched ? accountProblem : null)}</ErrorText>
      {wide && ctaButton}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <WeatherTicker />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing.six }}>
          <View style={{ width: '100%', maxWidth: wide ? 1120 : 640, alignSelf: 'center', paddingHorizontal: wide ? Spacing.five : Spacing.three, gap: Spacing.four }}>
            <Row style={{ justifyContent: 'space-between', paddingTop: Spacing.three }}>
              <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Back to home">
                <Brand />
              </Pressable>
              {!user && (
                <Pressable onPress={() => router.push('/sign-in')} accessibilityRole="button" style={{ padding: Spacing.two }}>
                  <T variant="label">Sign in</T>
                </Pressable>
              )}
            </Row>
            {place ? (
              <>
                <T variant="title" style={{ fontSize: wide ? 38 : 28, lineHeight: wide ? 42 : 32, letterSpacing: -1.1 }}>Get your driveway plowed</T>
                <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? Spacing.six : Spacing.five, alignItems: wide ? 'flex-start' : 'stretch' }}>
                  {details}
                  {checkout}
                </View>
              </>
            ) : (
              <View style={{ gap: Spacing.three, paddingTop: Spacing.four, maxWidth: 600 }}>
                <T variant="title" style={{ fontSize: 32, lineHeight: 36 }}>Where should we plow?</T>
                <AddressSearch large onPick={setPlace} autoFocus placeholder="Enter your home address" />
              </View>
            )}
          </View>
        </ScrollView>
        {!wide && place && (
          <View style={[{ paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Math.max(insets.bottom, Spacing.three), backgroundColor: theme.background }, elevation(2)]}>
            {ctaButton}
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// Driveway size as a picture card: little cars side by side show the width at a glance.
function SizeCard({ title, sub, cars, selected, onPress }: { title: string; sub: string; cars: number; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title} driveway`}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.two,
        borderRadius: Radius.lg,
        borderWidth: 2,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: selected ? theme.ice : theme.card,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Row gap={2}>
        {Array.from({ length: cars }, (_, i) => (
          <Icon key={i} name="car-sport" size={cars === 3 ? 18 : 22} color={selected ? 'accent' : 'textSecondary'} />
        ))}
      </Row>
      <T style={[{ fontSize: 16 }, font('700')]}>{title}</T>
      <T variant="caption" color="textSecondary">{sub}</T>
    </Pressable>
  );
}


