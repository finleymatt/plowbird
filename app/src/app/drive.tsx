import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/landing';
import { RecommendDriver } from '@/components/recommend-driver';
import { SnowScene } from '@/components/snow-scene';
import { Snowfall } from '@/components/snowfall';
import { SocialSignIn } from '@/components/social-sign-in';
import { Badge, Button, Card, ErrorText, Icon, Input, PasswordInput, Row, T, type IconName } from '@/components/ui';
import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';
import type { Availability, DriverApplication, DriverApplicationForm, PlowType, User } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// Driver recruiting + application. Drivers create an account, tell us about their truck,
// plow and insurance, and staff approve them at /admin before they can take jobs.

const SKY = Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, #D6E9FB 0%, #EEF6FF 60%, #FFFFFF 100%)' } as object) : { backgroundColor: '#E8F2FC' };
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

const HOW: { icon: IconName; title: string; body: string }[] = [
  { icon: 'document-text', title: 'Apply in 3 minutes', body: 'Your truck, plow, insurance and where you want to work.' },
  { icon: 'call', title: 'Quick call', body: 'We check your insurance and plow, usually within 2 business days.' },
  { icon: 'snow', title: 'Go online when it snows', body: 'Nearby driveways show up on your job board. Take the ones you want.' },
  { icon: 'cash', title: 'Get paid', body: 'Straight to your bank through Stripe. Tips are 100% yours.' },
];
const NEED = [
  'A pickup or truck with a working plow (any blade type)',
  'Commercial auto insurance that covers plowing, plus general liability insurance',
  'A valid driver’s license and a smartphone',
  '21 or older',
];
// What we check on the approval call, so drivers can have it ready.
const HAVE_READY = [
  'Your driver’s license',
  'Your insurance declarations page or card (auto with plow coverage, and general liability)',
  'A photo of your truck with the plow on',
  'A certificate of insurance (COI) before your first job. Ask your agent; it’s free.',
  'Your SSN or EIN for payouts and your 1099. You enter it with Stripe, never with us.',
];
const CONTRACTOR_TERMS = [
  'I’m an independent contractor, not an employee of Plowbird. I choose when to go online and which jobs to take, and I can plow for anyone else.',
  'I use my own truck, plow and equipment, and pay my own expenses, taxes and any business licenses.',
  'I’ll keep my license, registration and insurance current, and tell Plowbird right away if any of it lapses or changes.',
  'I’m responsible for damage or injury I cause while plowing, and my insurance covers it.',
  'I’ll follow traffic laws and local snow rules, and never drive impaired.',
];
const FAQ: { q: string; a: string }[] = [
  { q: 'Do I have to take every job?', a: 'No. Go online when you want work and pick the jobs that fit your route. Nothing is assigned to you.' },
  { q: 'Can I keep my own contract customers?', a: 'Yes. Plowbird fills the gaps between your routes. Customers you find through Plowbird book through Plowbird.' },
  { q: 'How do I get paid?', a: 'Set up payouts once (Stripe, about 5 minutes). Your share of each job lands in your bank after the job is done.' },
  { q: 'Who sees my phone number?', a: 'Only Plowbird. You and customers message each other in the app.' },
];
const PLOWS: { key: PlowType; label: string }[] = [
  { key: 'straight', label: 'Straight blade' },
  { key: 'v', label: 'V-plow' },
  { key: 'wing', label: 'Wing / expandable' },
  { key: 'box', label: 'Box / pusher' },
  { key: 'other', label: 'Other' },
];
const TIMES: { key: Availability; label: string }[] = [
  { key: 'overnight', label: 'Overnight' },
  { key: 'early_morning', label: 'Early morning' },
  { key: 'weekdays', label: 'Weekdays' },
  { key: 'weekends', label: 'Weekends' },
];
const RADII = [5, 10, 15, 25];
const YEARS: { label: string; years: number }[] = [
  { label: 'New to it', years: 0 },
  { label: '1–2 years', years: 1 },
  { label: '3–5 years', years: 3 },
  { label: '6+ years', years: 6 },
];

export default function DriveScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { user } = useAuth();
  const info = useApi<{ payout: Record<'single' | 'double' | 'triple', number> }>('/drive/info');
  const pay = info.data?.payout;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing.six }}>
          <View style={[{ overflow: 'hidden' }, SKY]}>
            <Snowfall />
            <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: wide ? Spacing.five : Spacing.three }}>
              <Row style={{ justifyContent: 'space-between', paddingVertical: Spacing.three }}>
                <Pressable onPress={() => router.replace('/')} accessibilityLabel="Plowbird home">
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
                  <Badge label="DRIVE WITH PLOWBIRD" tone="primary" icon="car" />
                  <T style={[{ fontSize: wide ? 50 : 36, lineHeight: wide ? 54 : 40, letterSpacing: wide ? -1.8 : -1.2 }, font('800')]}>
                    Get paid to plow driveways near you.
                  </T>
                  <T color="textSecondary" style={{ fontSize: wide ? 20 : 17, lineHeight: wide ? 29 : 25, maxWidth: 520 }}>
                    Fill the gaps between your routes with paid residential jobs. You pick the jobs. We bring the customers and handle the payments.
                  </T>
                  <Row gap={Spacing.four} style={{ flexWrap: 'wrap' }}>
                    <View>
                      <T style={[{ fontSize: 34, letterSpacing: -1 }, font('800')]}>{pay ? money(pay.double) : '$36'}</T>
                      <T variant="caption" color="textSecondary">per 2-car driveway</T>
                    </View>
                    <View>
                      <T style={[{ fontSize: 34, letterSpacing: -1 }, font('800')]}>100%</T>
                      <T variant="caption" color="textSecondary">of tips</T>
                    </View>
                    <View>
                      <T style={[{ fontSize: 34, letterSpacing: -1 }, font('800')]}>$0</T>
                      <T variant="caption" color="textSecondary">to sign up</T>
                    </View>
                  </Row>
                  {pay && (
                    <T variant="caption" color="textSecondary">
                      1-car {money(pay.single)} · 2-car {money(pay.double)} · 3-car {money(pay.triple)} at standard rates, more during heavy storms.
                    </T>
                  )}
                  <Pressable onPress={() => router.push('/driver-demo' as Href)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="map" color="accent" size={18} />
                    <T variant="label" color="accent">See a sample storm day: route, miles and pay →</T>
                  </Pressable>
                  {wide && <SnowScene width={460} />}
                </View>
                <View style={{ flex: wide ? 1 : undefined }}>
                  <ApplyCard user={user} />
                </View>
              </View>
            </View>
          </View>

          <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: wide ? Spacing.five : Spacing.three, gap: Spacing.five, paddingTop: Spacing.five }}>
            <View style={{ gap: Spacing.three }}>
              <T variant="heading" style={{ fontSize: 22 }}>How it works</T>
              <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.three }}>
                {HOW.map((h, i) => (
                  <Card key={h.title} style={{ flex: wide ? 1 : undefined, gap: Spacing.two }}>
                    <Row>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.ice, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={h.icon} color="accent" size={18} />
                      </View>
                      <T variant="caption" color="textSecondary">Step {i + 1}</T>
                    </Row>
                    <T variant="label">{h.title}</T>
                    <T variant="caption" color="textSecondary">{h.body}</T>
                  </Card>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.five }}>
              <View style={{ flex: 1, gap: Spacing.three }}>
                <T variant="heading" style={{ fontSize: 22 }}>What you need</T>
                {NEED.map((n) => (
                  <Row key={n} style={{ alignItems: 'flex-start' }}>
                    <Icon name="checkmark-circle" color="accent" />
                    <T style={{ flex: 1, lineHeight: 23 }}>{n}</T>
                  </Row>
                ))}
              </View>
              <View style={{ flex: 1, gap: Spacing.three }}>
                <T variant="heading" style={{ fontSize: 22 }}>Have these ready</T>
                {HAVE_READY.map((n) => (
                  <Row key={n} style={{ alignItems: 'flex-start' }}>
                    <Icon name="document-text" color="accent" />
                    <T style={{ flex: 1, lineHeight: 23 }}>{n}</T>
                  </Row>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.five }}>
              <View style={{ flex: 1, gap: Spacing.three }}>
                <T variant="heading" style={{ fontSize: 22 }}>Questions</T>
                {FAQ.map((f) => (
                  <View key={f.q} style={{ gap: 4 }}>
                    <T variant="label">{f.q}</T>
                    <T color="textSecondary" style={{ lineHeight: 22 }}>{f.a}</T>
                  </View>
                ))}
              </View>
            </View>
            <RecommendDriver />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// The right-hand card: account → application → status.
function ApplyCard({ user }: { user: User | null }) {
  const driver = user?.role === 'driver';
  const app = useApi<DriverApplication>(driver ? '/driver/application' : null);
  const status = app.data?.status ?? user?.driverStatus ?? 'none';

  return (
    <Card raised style={{ gap: Spacing.three, padding: Spacing.four }}>
      {!user ? (
        <CreateAccount />
      ) : !driver ? (
        <SignedInAsCustomer />
      ) : app.loading && !app.data ? (
        <T color="textSecondary">Loading…</T>
      ) : status === 'none' || status === 'rejected' ? (
        <ApplicationForm user={user} previous={app.data?.application ?? null} note={status === 'rejected' ? app.data?.note ?? null : null} onDone={() => app.reload()} />
      ) : (
        <StatusView status={status} phone={app.data?.application?.phone ?? user.phone} />
      )}
    </Card>
  );
}

function CreateAccount() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const problem = !name.trim() ? 'Enter your name' : !validEmail(email) ? 'Enter a valid email' : phone.replace(/\D/g, '').length < 10 ? 'Enter your mobile number' : password.length < 8 ? 'Password needs 8+ characters' : null;
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await signUp({ role: 'driver', name: name.trim(), email: email.trim(), phone: phone.trim(), password });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? 'That email already has an account. Sign in to apply.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={{ gap: 4 }}>
        <T variant="heading" style={{ fontSize: 20 }}>Apply to drive</T>
        <T variant="caption" color="textSecondary">Step 1 of 2: your account. Takes about 3 minutes in total.</T>
      </View>
      <SocialSignIn role="driver" onDone={() => setError(null)} />
      <Input label="Name" value={name} onChangeText={setName} placeholder="First and last name" autoComplete="name" />
      <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Mobile phone" value={phone} onChangeText={setPhone} placeholder="So we can call you. Customers never see it." keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
      <PasswordInput label="Create a password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" autoComplete="new-password" />
      <ErrorText>{error}</ErrorText>
      <Button title="Continue" onPress={submit} loading={busy} />
      <Pressable onPress={() => router.push('/sign-in')}>
        <T variant="caption" color="accent" style={{ textAlign: 'center' }}>Already have a driver account? Sign in</T>
      </Pressable>
    </>
  );
}

function SignedInAsCustomer() {
  const { signOut } = useAuth();
  return (
    <View style={{ gap: Spacing.three, alignItems: 'flex-start' }}>
      <T variant="heading" style={{ fontSize: 20 }}>Apply to drive</T>
      <T color="textSecondary">You’re signed in with a customer account. Driver accounts use a separate email, so sign out first to apply.</T>
      <Button title="Sign out to apply" kind="dark" onPress={() => signOut()} />
    </View>
  );
}

function StatusView({ status, phone }: { status: 'pending' | 'approved'; phone: string | null }) {
  const { user } = useAuth();
  return status === 'approved' && user?.driverReady === false ? (
    <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
      <Icon name="create" size={40} color="accent" />
      <T variant="title">You’re approved. One more step</T>
      <T color="textSecondary">Sign your contractor agreement and send us your certificate of insurance, then you can take jobs.</T>
      <Button title="Sign my agreement" onPress={() => router.push('/driver-agreement' as Href)} />
    </View>
  ) : status === 'approved' ? (
    <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
      <Icon name="checkmark-circle" size={40} color="success" />
      <T variant="title">You’re approved ❄️</T>
      <T color="textSecondary">Go online on your job board when it snows, and set up payouts in Account so you get paid.</T>
      <Button title="Open my job board" kind="dark" onPress={() => router.replace('/driver')} />
    </View>
  ) : (
    <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
      <Icon name="time" size={40} color="accent" />
      <T variant="title">Application received</T>
      <T color="textSecondary">
        We’ll call you{phone ? ` at ${phone}` : ''} within 2 business days to check your insurance and plow. Have a photo of your insurance card and your truck with the plow ready.
      </T>
      <T color="textSecondary">Meanwhile, set up payouts in your driver account so you’re ready for the first storm.</T>
      <Button title="Open driver account" kind="dark" onPress={() => router.replace('/driver')} />
    </View>
  );
}

function ApplicationForm({ user, previous, note, onDone }: { user: User; previous: DriverApplicationForm | null; note: string | null; onDone: () => void }) {
  const theme = useTheme();
  const { setUser } = useAuth();
  const [phone, setPhone] = useState(previous?.phone ?? user.phone ?? '');
  const [zip, setZip] = useState(previous?.zip ?? '');
  const [radius, setRadius] = useState(previous?.radiusMiles ?? 10);
  const [truck, setTruck] = useState(previous?.truck ?? user.vehicle ?? '');
  const [plowType, setPlowType] = useState<PlowType>(previous?.plowType ?? 'straight');
  const [width, setWidth] = useState(previous?.plowWidthFt ? String(previous.plowWidthFt) : '');
  const [years, setYears] = useState(previous?.yearsPlowing ?? 1);
  const [times, setTimes] = useState<Availability[]>(previous?.availability ?? []);
  const [shovel, setShovel] = useState(previous?.shovel ?? false);
  const [insured, setInsured] = useState(previous?.insured ?? false);
  const [carrier, setCarrier] = useState(previous?.insuranceCarrier ?? '');
  const [heard, setHeard] = useState(previous?.heardFrom ?? '');
  const [notes, setNotes] = useState(previous?.notes ?? '');
  const [licenseState, setLicenseState] = useState(previous?.licenseState ?? 'MN');
  const [licenseExpires, setLicenseExpires] = useState(monthToInput(previous?.licenseExpires));
  const [over21, setOver21] = useState(previous?.over21 ?? false);
  const [liability, setLiability] = useState(previous?.liabilityInsured ?? false);
  const [insuranceExpires, setInsuranceExpires] = useState(monthToInput(previous?.insuranceExpires));
  const [coi, setCoi] = useState(previous?.coiAgreed ?? false);
  const [business, setBusiness] = useState(previous?.businessName ?? '');
  const [contractor, setContractor] = useState(false);
  const [sms, setSms] = useState(previous?.smsConsent ?? false);
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chip = (selected: boolean) => ({
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: selected ? theme.accent : theme.border,
    backgroundColor: selected ? theme.ice : theme.card,
  });

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/driver/application', {
        body: {
          phone,
          zip: zip.trim(),
          radiusMiles: radius,
          truck,
          plowType,
          plowWidthFt: Number(width) || null,
          yearsPlowing: years,
          availability: times,
          shovel,
          insured,
          insuranceCarrier: carrier || null,
          heardFrom: heard || null,
          notes: notes || null,
          licenseState: licenseState.trim(),
          licenseExpires: inputToMonth(licenseExpires) ?? '',
          over21,
          liabilityInsured: liability,
          insuranceExpires: inputToMonth(insuranceExpires),
          coiAgreed: coi,
          businessName: business.trim() || null,
          contractorAck: contractor,
          smsConsent: sms,
          signature: signature.trim(),
        },
      });
      setUser(await api<User>('/me'));
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={{ gap: 4 }}>
        <T variant="heading" style={{ fontSize: 20 }}>Your truck and plow</T>
        <T variant="caption" color="textSecondary">Step 2 of 2. Hi {user.name.split(' ')[0]}, tell us how you plow.</T>
      </View>
      {note && (
        <Card style={{ backgroundColor: theme.backgroundElement }}>
          <T variant="caption">Last time: {note}</T>
        </Card>
      )}
      <Input label="Mobile phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="So we can call you" />
      <Row gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Input label="ZIP you plow from" value={zip} onChangeText={(t) => setZip(t.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" placeholder="55423" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Blade width (ft)" value={width} onChangeText={(t) => setWidth(t.replace(/[^\d.]/g, '').slice(0, 4))} keyboardType="decimal-pad" placeholder="8" />
        </View>
      </Row>
      <View style={{ gap: 6 }}>
        <T variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>How far will you drive for a job?</T>
        <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
          {RADII.map((r) => (
            <Pressable key={r} onPress={() => setRadius(r)} style={chip(radius === r)} accessibilityLabel={`${r} miles`} accessibilityRole="radio" accessibilityState={{ selected: radius === r }}>
              <T variant="label">{r} mi</T>
            </Pressable>
          ))}
        </Row>
      </View>
      <Input label="Truck" value={truck} onChangeText={setTruck} placeholder="e.g. 2019 Ford F-250" />
      <View style={{ gap: 6 }}>
        <T variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>Plow</T>
        <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
          {PLOWS.map((p) => (
            <Pressable key={p.key} onPress={() => setPlowType(p.key)} style={chip(plowType === p.key)} accessibilityLabel={p.label} accessibilityRole="radio" accessibilityState={{ selected: plowType === p.key }}>
              <T variant="label">{p.label}</T>
            </Pressable>
          ))}
        </Row>
      </View>
      <View style={{ gap: 6 }}>
        <T variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>Plowing experience</T>
        <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
          {YEARS.map((y) => (
            <Pressable key={y.label} onPress={() => setYears(y.years)} style={chip(years === y.years)} accessibilityLabel={y.label} accessibilityRole="radio" accessibilityState={{ selected: years === y.years }}>
              <T variant="label">{y.label}</T>
            </Pressable>
          ))}
        </Row>
      </View>
      <View style={{ gap: 6 }}>
        <T variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>When can you plow? (pick all that apply)</T>
        <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
          {TIMES.map((t) => {
            const on = times.includes(t.key);
            return (
              <Pressable key={t.key} onPress={() => setTimes((v) => (on ? v.filter((x) => x !== t.key) : [...v, t.key]))} style={chip(on)} accessibilityLabel={t.label} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <T variant="label">{t.label}</T>
              </Pressable>
            );
          })}
        </Row>
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="label" style={{ flex: 1 }}>I can also clear walks (shovel or snowblower)</T>
        <Switch accessibilityLabel="I can also clear walks" value={shovel} onValueChange={setShovel} trackColor={{ true: theme.accent, false: theme.backgroundSelected }} thumbColor="#fff" />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T variant="label">I have commercial auto insurance that covers plowing</T>
          <T variant="caption" color="textSecondary">Required. We’ll ask for proof on the call.</T>
        </View>
        <Switch accessibilityLabel="I have commercial auto insurance that covers plowing" value={insured} onValueChange={setInsured} trackColor={{ true: theme.accent, false: theme.backgroundSelected }} thumbColor="#fff" />
      </Row>
      {insured && (
        <Row gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1.4 }}>
            <Input label="Insurance company (optional)" value={carrier} onChangeText={setCarrier} placeholder="e.g. Progressive Commercial" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Renews (optional)" value={insuranceExpires} onChangeText={(t) => setInsuranceExpires(maskMonth(t))} keyboardType="number-pad" placeholder="MM/YYYY" />
          </View>
        </Row>
      )}
      <Toggle label="I have general liability insurance" hint="Required. Covers damage to property and injuries while you plow." value={liability} onChange={setLiability} />
      <Toggle label="I’ll send a certificate of insurance before my first job" hint="Your agent can email it to us. It’s free." value={coi} onChange={setCoi} />

      <View style={{ gap: 4, marginTop: Spacing.two }}>
        <T variant="heading" style={{ fontSize: 17 }}>License and business</T>
      </View>
      <Row gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Input label="License state" value={licenseState} onChangeText={(t) => setLicenseState(t.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase())} autoCapitalize="characters" placeholder="MN" />
        </View>
        <View style={{ flex: 1.4 }}>
          <Input label="License expires" value={licenseExpires} onChangeText={(t) => setLicenseExpires(maskMonth(t))} keyboardType="number-pad" placeholder="MM/YYYY" />
        </View>
      </Row>
      <Toggle label="I’m 21 or older" value={over21} onChange={setOver21} />
      <Input label="Business name (optional)" value={business} onChangeText={setBusiness} placeholder="Leave blank if you work as an individual" />
      <Input label="How did you hear about us? (optional)" value={heard} onChangeText={setHeard} placeholder="Flyer, Facebook, a friend…" />
      <Input label="Anything else? (optional)" value={notes} onChangeText={setNotes} placeholder="Other equipment, areas you know well…" multiline style={{ minHeight: 70, paddingTop: 12 }} />

      <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
        <T variant="heading" style={{ fontSize: 17 }}>Independent contractor agreement</T>
        <Card style={{ backgroundColor: theme.backgroundElement, gap: Spacing.two }}>
          {CONTRACTOR_TERMS.map((t) => (
            <Row key={t} style={{ alignItems: 'flex-start' }}>
              <Icon name="checkmark-circle" color="accent" size={16} />
              <T variant="caption" style={{ flex: 1, lineHeight: 19 }}>{t}</T>
            </Row>
          ))}
          <T variant="caption" color="textSecondary" style={{ lineHeight: 19 }}>
            Before approval, we may ask your separate written permission to check your driving record. We’ll never run a check without it.
          </T>
        </Card>
        <Toggle
          label="I agree to the statements above and the Terms of Service"
          value={contractor}
          onChange={setContractor}
          hint={
            <T variant="caption" color="textSecondary">
              Read the{' '}
              <T variant="caption" color="accent" onPress={() => router.push('/terms')}>Terms of Service</T> and{' '}
              <T variant="caption" color="accent" onPress={() => router.push('/privacy')}>Privacy Policy</T>.
            </T>
          }
        />
        <Toggle label="Text me about my application and nearby jobs (optional)" hint="Msg & data rates may apply. Reply STOP to opt out." value={sms} onChange={setSms} />
        <Input label="Sign with your full legal name" value={signature} onChangeText={setSignature} placeholder={user.name} autoComplete="name" />
        <T variant="caption" color="textSecondary">Typing your name is your electronic signature. Everything above is true to the best of my knowledge.</T>
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title="Submit application" onPress={submit} loading={busy} />
    </>
  );
}

// MM/YYYY in the form, YYYY-MM on the wire.
const maskMonth = (t: string) => {
  const d = t.replace(/\D/g, '').slice(0, 6);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const inputToMonth = (t: string) => {
  const m = /^(\d{2})\/(\d{4})$/.exec(t.trim());
  return m ? `${m[2]}-${m[1]}` : null;
};
const monthToInput = (ym?: string | null) => (ym && /^\d{4}-\d{2}$/.test(ym) ? `${ym.slice(5)}/${ym.slice(0, 4)}` : '');

function Toggle({ label, hint, value, onChange }: { label: string; hint?: ReactNode; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <T variant="label">{label}</T>
        {typeof hint === 'string' ? <T variant="caption" color="textSecondary">{hint}</T> : hint}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: theme.accent, false: theme.backgroundSelected }} thumbColor="#fff" />
    </Row>
  );
}
