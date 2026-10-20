import { useState } from 'react';
import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { getAttribution } from '@/lib/attribution';
import { useAuth } from '@/lib/auth';

import { Button, ErrorText, Icon, Input, Row, T } from './ui';

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

type Props = {
  /** Where the signup came from, e.g. 'landing' or 'outside_area'. */
  source: string;
  address?: string;
  lat?: number;
  lng?: number;
  /** Ask for a mobile number too (optional for the person). */
  withPhone?: boolean;
  cta?: string;
  /** One line: email and button side by side on wide screens. */
  inline?: boolean;
  done?: string;
};

// Storm alerts / waitlist signup: an email (and maybe a phone) into POST /leads.
export function WaitlistForm({ source, address, lat, lng, withPhone, cta = 'Notify me', inline, done }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!validEmail(email)) return setError('Enter a valid email');
    setBusy(true);
    setError(null);
    try {
      await api('/leads', {
        body: { email: email.trim(), phone: phone.trim() || undefined, address, lat, lng, source, attribution: await getAttribution() },
      });
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Row gap={Spacing.two} style={{ backgroundColor: `${theme.success}1A`, borderRadius: Radius.md, padding: Spacing.three, alignItems: 'flex-start' }}>
        <Icon name="checkmark-circle" color="success" />
        <T variant="label" style={{ flex: 1 }}>{done ?? 'You’re on the list. We’ll be in touch before the next storm.'}</T>
      </Row>
    );
  }

  const emailInput = (
    <Input
      value={email}
      onChangeText={setEmail}
      placeholder="you@example.com"
      autoCapitalize="none"
      keyboardType="email-address"
      autoComplete="email"
      textContentType="emailAddress"
      accessibilityLabel="Email"
      onSubmitEditing={submit}
    />
  );
  return (
    <View style={{ gap: Spacing.two }}>
      {inline ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          <View style={{ flexGrow: 1, flexBasis: 220 }}>{emailInput}</View>
          <Button title={cta} onPress={submit} loading={busy} style={{ flexGrow: 1, flexBasis: 140, minHeight: 52 }} />
        </View>
      ) : (
        <>
          {emailInput}
          {withPhone && (
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="Mobile (optional, for a text when we launch)"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              accessibilityLabel="Mobile phone"
            />
          )}
          <Button title={cta} onPress={submit} loading={busy} />
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
