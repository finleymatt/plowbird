import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressSearch, type Place } from '@/components/address-search';
import { QuoteLines, TipPicker } from '@/components/job-parts';
import { Brand } from '@/components/landing';
import { LiveMap } from '@/components/live-map';
import { PaymentMethodCard } from '@/components/payment-method';
import { Badge, Button, Card, Chip, ChipGroup, elevation, ErrorText, Icon, Input, PasswordInput, Row, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LENGTH_LABEL, money, SIZE_LABEL } from '@/lib/format';
import type { Conditions, DrivewayLength, DrivewaySize, Job, PaymentMethods, Property, Quote } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const DEPTHS = [2, 4, 6, 8, 12, 18];
const SIZE_HINT: Record<DrivewaySize, string> = { single: 'Fits 1 car wide', double: 'Most homes', triple: 'Fits 3 wide', large: 'Rural / acreage' };
const nearestDepth = (inches: number) => DEPTHS.reduce((best, d) => (Math.abs(d - inches) < Math.abs(best - inches) ? d : best), 4);
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

// Tomorrow-morning quick picks, like "Deliver later" on a food app.
function useSlots() {
  return useMemo(() => {
    const at = (h: number) => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(h, 0, 0, 0);
      return d.toISOString();
    };
    return [
      { key: 'now', label: 'ASAP', sub: 'Next available driver', at: null },
      { key: '6', label: 'Tomorrow 6 AM', sub: 'Before the commute', at: at(6) },
      { key: '7', label: 'Tomorrow 7 AM', sub: null, at: at(7) },
      { key: '8', label: 'Tomorrow 8 AM', sub: null, at: at(8) },
    ];
  }, []);
}

export default function Order() {
  const params = useLocalSearchParams<{ address?: string; lat?: string; lng?: string }>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const insets = useSafeAreaInsets();
  const { user, signUp, signIn } = useAuth();

  const [place, setPlace] = useState<Place | null>(
    params.address && params.lat && params.lng ? { address: params.address, lat: Number(params.lat), lng: Number(params.lng) } : null,
  );
  const [size, setSize] = useState<DrivewaySize>('double');
  const [length, setLength] = useState<DrivewayLength>('standard');
  const [sidewalk, setSidewalk] = useState(false);
  const slots = useSlots();
  const [slot, setSlot] = useState('now');
  const [depth, setDepth] = useState<number | null>(null);
  const [tip, setTip] = useState(500);
  const [notes, setNotes] = useState('');

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
  const effectiveDepth = depth ?? (forecastIn > 0 ? nearestDepth(forecastIn) : 4);

  const [quote, setQuote] = useState<Quote | null>(null);
  useEffect(() => {
    if (!place) return;
    let stale = false;
    api<Quote>(`/quote/preview?lat=${place.lat}&lng=${place.lng}&size=${size}&length=${length}&sidewalk=${sidewalk ? 1 : 0}&depth=${effectiveDepth}`)
      .then((q) => !stale && setQuote(q))
      .catch((e) => !stale && setError(e.message));
    return () => {
      stale = true;
    };
  }, [place, size, length, sidewalk, effectiveDepth]);

  const needsCard = payments.data?.mode === 'stripe' && !payments.data.card;
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
      if (pm.mode === 'stripe' && !pm.card) {
        payments.setData(pm);
        throw new Error('Add a card below to finish booking. You’re only charged once your driveway is clear.');
      }
      // Reuse a saved driveway at this address, otherwise save it.
      const saved = await api<Property[]>('/properties');
      const same = saved.find((p) => p.address.toLowerCase() === place.address.toLowerCase());
      const details = { size, length, sidewalk, notes: notes.trim() || undefined };
      const property = same
        ? await api<Property>(`/properties/${same.id}`, { method: 'PATCH', body: details })
        : await api<Property>('/properties', { body: { ...place, label: saved.length ? `Driveway ${saved.length + 1}` : 'Home', ...details } });
      const job = await api<Job>('/jobs', {
        body: {
          propertyId: property.id,
          depthIn: effectiveDepth,
          tipCents: tip,
          notes: notes.trim() || undefined,
          scheduledFor: slots.find((s) => s.key === slot)?.at ?? undefined,
        },
      });
      router.replace({ pathname: '/customer/job/[id]', params: { id: String(job.id) } });
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const total = quote ? quote.total + tip : null;
  const cta = !place ? 'Enter your address' : `${slot === 'now' ? 'Request plow' : 'Schedule plow'}${total != null ? ` · ${money(total)}` : ''}`;

  const details = (
    <View style={{ gap: Spacing.four, flex: wide ? 1.3 : undefined }}>
      <Step n={1} title="Where">
        {place ? (
          <View style={{ gap: Spacing.three }}>
            <LiveMap pins={[{ id: 'home', kind: 'home', lat: place.lat, lng: place.lng, title: 'Your driveway' }]} height={180} />
            <Row>
              <Icon name="location-sharp" color="primary" />
              <T variant="heading" style={{ flex: 1 }}>{place.address}</T>
              <Button title="Change" size="sm" kind="secondary" onPress={() => setPlace(null)} />
            </Row>
            {wx.data && forecastIn > 0 && <Badge label={`${forecastIn}" of snow forecast in the next 24 hrs`} tone="primary" icon="snow" />}
          </View>
        ) : (
          <AddressSearch onPick={setPlace} autoFocus />
        )}
      </Step>

      {place && (
        <>
          <Step n={2} title="Your driveway">
            <ChipGroup>
              {(Object.keys(SIZE_LABEL) as DrivewaySize[]).map((s) => (
                <Chip key={s} label={SIZE_LABEL[s]} sublabel={SIZE_HINT[s]} selected={size === s} onPress={() => setSize(s)} />
              ))}
            </ChipGroup>
            <ChipGroup>
              {(Object.keys(LENGTH_LABEL) as DrivewayLength[]).map((l) => (
                <Chip
                  key={l}
                  label={`${LENGTH_LABEL[l]} length`}
                  sublabel={{ short: 'Under 30 ft', standard: '30–60 ft', long: 'Over 60 ft' }[l]}
                  selected={length === l}
                  onPress={() => setLength(l)}
                />
              ))}
            </ChipGroup>
            <Pressable onPress={() => setSidewalk((v) => !v)}>
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <T variant="label">Add sidewalk & front walk</T>
                    <T variant="caption" color="textSecondary">Many cities require it within 24 hrs of snowfall. +$10</T>
                  </View>
                  <Switch value={sidewalk} onValueChange={setSidewalk} trackColor={{ true: theme.primary, false: theme.backgroundSelected }} thumbColor="#fff" />
                </Row>
              </Card>
            </Pressable>
          </Step>

          <Step n={3} title="When">
            <ChipGroup>
              {slots.map((s) => (
                <Chip key={s.key} label={s.label} sublabel={s.sub ?? undefined} icon={s.key === 'now' ? 'flash' : 'time-outline'} selected={slot === s.key} onPress={() => setSlot(s.key)} />
              ))}
            </ChipGroup>
            <T variant="caption" color="textSecondary">Need another time? You can schedule any hour in the next 7 days from your account.</T>
          </Step>

          <Step n={4} title="How much snow?">
            <ChipGroup>
              {DEPTHS.map((d) => (
                <Chip key={d} label={d === 18 ? '18"+' : `${d}"`} selected={effectiveDepth === d} onPress={() => setDepth(d)} />
              ))}
            </ChipGroup>
            <Input value={notes} onChangeText={setNotes} placeholder="Notes for your driver (optional): gate code, where to pile snow…" />
          </Step>
        </>
      )}
    </View>
  );

  const summary = place && (
    <Card raised style={{ gap: Spacing.three, padding: Spacing.four }}>
      <T variant="heading">Order summary</T>
      {quote ? <QuoteLines quote={quote} tipCents={tip} /> : <T color="textSecondary">Calculating…</T>}
      <T variant="label" color="textSecondary">Tip your driver · 100% goes to them</T>
      <TipPicker value={tip} onChange={setTip} base={quote?.total ?? 4500} />
    </Card>
  );

  const account = place && (
    <View style={{ gap: Spacing.three }}>
      {user ? (
        user.role === 'customer' && (
          <>
            <Row>
              <Icon name="person-circle" />
              <T variant="label" style={{ flex: 1 }}>Booking as {user.name}</T>
            </Row>
            <PaymentMethodCard methods={payments.data} onChange={payments.setData} />
          </>
        )
      ) : (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="heading">{hasAccount ? 'Sign in to book' : 'Your details'}</T>
            <Button title={hasAccount ? 'New here?' : 'I have an account'} size="sm" kind="secondary" onPress={() => setHasAccount((v) => !v)} />
          </Row>
          {!hasAccount && (
            <>
              <Input label="Name" value={name} onChangeText={setName} placeholder="First and last name" autoComplete="name" textContentType="name"
                invalid={touched && !name.trim()} />
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
          <Row gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
            <Icon name="shield-checkmark" size={18} color="success" />
            <T variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {payments.data?.mode === 'stripe' ? 'You’ll add a card next. ' : ''}You’re only charged once your driveway is clear. Cancel free until your driver heads out.
            </T>
          </Row>
        </>
      )}
      <ErrorText>{error ?? (touched ? accountProblem : null)}</ErrorText>
    </View>
  );

  const ctaButton = (
    <Button title={cta} onPress={submit} loading={busy} disabled={!quote || (!!user && (user.role !== 'customer' || needsCard))} />
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing.six }}>
          <View style={{ width: '100%', maxWidth: wide ? 1120 : 640, alignSelf: 'center', paddingHorizontal: wide ? Spacing.five : Spacing.three, gap: Spacing.four }}>
            <Row style={{ justifyContent: 'space-between', paddingTop: Spacing.three }}>
              <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Back to home">
                <Brand />
              </Pressable>
              {!user && <Button title="Sign in" size="sm" kind="secondary" onPress={() => router.push('/sign-in')} />}
            </Row>
            <T variant="title" style={{ fontSize: wide ? 40 : 30, lineHeight: wide ? 44 : 34, letterSpacing: -1.2 }}>
              {place ? 'Get your driveway plowed' : 'Where should we plow?'}
            </T>
            {wide ? (
              <View style={{ flexDirection: 'row', gap: Spacing.six, alignItems: 'flex-start' }}>
                {details}
                {place && (
                  <View style={{ flex: 1, gap: Spacing.four }}>
                    {summary}
                    {account}
                    {ctaButton}
                  </View>
                )}
              </View>
            ) : (
              <>
                {details}
                {summary}
                {account}
              </>
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

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.three, alignSelf: 'stretch' }}>
      <Row>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: theme.text, alignItems: 'center', justifyContent: 'center' }}>
          <T variant="caption" style={{ color: theme.background, fontWeight: '800' }}>{n}</T>
        </View>
        <T variant="heading">{title}</T>
      </Row>
      {children}
    </View>
  );
}
