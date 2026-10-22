import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/landing';
import { SUPPORT_EMAIL } from '@/components/legal';
import { Badge, Button, Card, ErrorText, Icon, Input, Row, T } from '@/components/ui';
import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { DriverAgreement, DriverOnboarding, User } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// Driver onboarding after approval: the checklist, and the contractor agreement to read and sign.
// The agreement text comes from the server (server/src/agreement.js), which stores what was signed.

export default function DriverAgreementScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { user, loading, setUser } = useAuth();
  const driver = user?.role === 'driver';
  const doc = useApi<DriverAgreement>(driver ? '/driver/agreement' : null);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 860, alignSelf: 'center', padding: wide ? Spacing.five : Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.replace('/')} accessibilityLabel="Plowbird home">
            <Brand />
          </Pressable>
          {driver && <Button title="Driver app" kind="secondary" size="sm" onPress={() => router.replace('/driver')} />}
        </Row>

        {loading ? null : !user ? (
          <Card style={{ gap: Spacing.three, alignItems: 'flex-start' }}>
            <T variant="title">Sign in to see your agreement</T>
            <T color="textSecondary">Use the driver account you applied with.</T>
            <Button title="Sign in" kind="dark" onPress={() => router.push('/sign-in')} />
          </Card>
        ) : !driver ? (
          <Card style={{ gap: Spacing.two }}>
            <T variant="title">This page is for drivers</T>
            <T color="textSecondary">You’re signed in with a customer account.</T>
          </Card>
        ) : !doc.data ? (
          <T color="textSecondary">{doc.error ?? 'Loading…'}</T>
        ) : (
          <>
            <Checklist o={doc.data.onboarding} />
            <Agreement
              doc={doc.data}
              user={user}
              onSigned={async (fresh) => {
                doc.setData(fresh);
                setUser(await api<User>('/me'));
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Checklist({ o }: { o: DriverOnboarding }) {
  const theme = useTheme();
  const next = o.steps.find((s) => !s.done && !s.optional);
  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ gap: 4 }}>
        <T variant="title">{o.ready ? 'You’re all set ❄️' : 'Finish getting set up'}</T>
        <T color="textSecondary">
          {o.ready
            ? 'Go online on your job board whenever it snows.'
            : 'A few steps before your first job. You can go online once the required ones are done.'}
        </T>
      </View>
      <Card style={{ gap: Spacing.two }}>
        {o.steps.map((s, i) => (
          <Row key={s.key} style={{ alignItems: 'flex-start' }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: s.done ? theme.success : s === next ? theme.primary : theme.backgroundSelected,
              }}>
              {s.done ? <Icon name="checkmark" size={16} color="primaryText" /> : <T style={[{ color: '#fff', fontSize: 12 }, font('800')]}>{i + 1}</T>}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label" style={{ textDecorationLine: s.done ? 'line-through' : 'none', opacity: s.done ? 0.6 : 1 }}>
                {s.label}
                {s.optional ? ' (can wait until after your first job)' : ''}
              </T>
              {s.key === 'coi' && !s.done && (
                <T variant="caption" color="textSecondary">
                  Ask your insurance agent to email a certificate of insurance (auto with plow coverage, and general liability) to {SUPPORT_EMAIL}. It’s free and usually same-day.
                  We’ll mark it received here.
                </T>
              )}
              {s.key === 'payouts' && !s.done && (
                <Pressable onPress={() => router.push('/driver/earnings')}>
                  <T variant="caption" color="accent">Set up payouts on the Earnings tab →</T>
                </Pressable>
              )}
            </View>
          </Row>
        ))}
      </Card>
    </View>
  );
}

function Agreement({ doc, user, onSigned }: { doc: DriverAgreement; user: User; onSigned: (d: DriverAgreement) => void }) {
  const theme = useTheme();
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = doc.onboarding.agreement.current;
  const approved = user.driverStatus === 'approved';

  const sign = async () => {
    setBusy(true);
    setError(null);
    try {
      onSigned(await api<DriverAgreement>('/driver/agreement/sign', { body: { agree, signature, version: doc.version } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two }}>
        <View>
          <T variant="heading" style={{ fontSize: 22 }}>Independent Contractor Agreement</T>
          <T variant="caption" color="textSecondary">Version {doc.version}</T>
        </View>
        {current ? <Badge label={`SIGNED ${new Date(doc.signed!.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`} tone="success" icon="checkmark-circle" /> : null}
      </Row>

      <Card style={{ gap: 6, backgroundColor: theme.ice }}>
        <T variant="label">The short version</T>
        {[
          'You’re an independent contractor: your hours, your jobs, your truck. You can plow for anyone else too.',
          'You get the payout shown when you accept, plus 100% of tips, paid through Stripe.',
          'Keep your license and insurance current, and send us a certificate of insurance.',
          'Keep customer info private (addresses, codes, phone numbers) and use it only for Plowbird jobs.',
          'Don’t take Plowbird customers off the app: no side deals with customers you met through us, for 12 months after your last job.',
          'Either of us can end this any time.',
        ].map((x) => (
          <Row key={x} style={{ alignItems: 'flex-start' }}>
            <Icon name="checkmark-circle" color="accent" size={16} />
            <T variant="caption" style={{ flex: 1, lineHeight: 19 }}>{x}</T>
          </Row>
        ))}
        <T variant="caption" color="textSecondary">The summary is for convenience; the full text below is what you sign.</T>
      </Card>

      <Card style={{ gap: Spacing.three, padding: Spacing.four }}>
        {doc.sections.map((s) => (
          <View key={s.title} style={{ gap: 6 }}>
            <T variant="label">{s.title}</T>
            {s.paragraphs.map((p, i) => (
              <T key={i} style={{ lineHeight: 23 }} selectable>{p}</T>
            ))}
          </View>
        ))}
      </Card>

      {current ? (
        <Card style={{ gap: Spacing.two }}>
          <Row>
            <Icon name="checkmark-circle" color="success" />
            <T variant="heading" style={{ flex: 1 }}>Signed by {doc.signed!.signature}</T>
          </Row>
          <T variant="caption" color="textSecondary">
            On {new Date(doc.signed!.at).toLocaleString('en-US')}. A copy was emailed to you if email is set up; you can always come back here.
          </T>
          {Platform.OS === 'web' && (
            <View style={{ alignSelf: 'flex-start' }}>
              <Button title="Print or save as PDF" icon="print" kind="secondary" size="sm" onPress={() => window.print()} />
            </View>
          )}
        </Card>
      ) : !approved ? (
        <Card style={{ gap: Spacing.two }}>
          <T variant="heading">You can sign once you’re approved</T>
          <T color="textSecondary">Read it now if you like. After our quick call, we’ll send you back here to sign.</T>
        </Card>
      ) : (
        <Card raised style={{ gap: Spacing.three, borderWidth: 2, borderColor: theme.primary, borderRadius: Radius.lg }}>
          <T variant="heading">{doc.signed ? 'Sign the updated agreement' : 'Sign'}</T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="label" style={{ flex: 1 }}>I have read and agree to the Independent Contractor Agreement above, including the confidentiality and customer non-solicitation sections.</T>
            <Switch accessibilityLabel="I agree" value={agree} onValueChange={setAgree} trackColor={{ true: theme.accent, false: theme.backgroundSelected }} thumbColor="#fff" />
          </Row>
          <Input label="Type your full legal name" value={signature} onChangeText={setSignature} placeholder={user.name} autoComplete="name" />
          <T variant="caption" color="textSecondary">
            Typing your name is your electronic signature. We record it with the date, time and the exact text you signed.
          </T>
          <ErrorText>{error}</ErrorText>
          <Button title="Sign agreement" icon="create" onPress={sign} loading={busy} disabled={!agree || signature.trim().length < 3} />
        </Card>
      )}
    </View>
  );
}
