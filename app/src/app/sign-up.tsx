import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Brand } from '@/components/landing';
import { SocialSignIn } from '@/components/social-sign-in';
import { Button, ErrorText, Icon, Input, PasswordInput, Row, Screen, T, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export default function SignUp() {
  const params = useLocalSearchParams<{ role?: Role }>();
  const { signUp } = useAuth();
  const [role, setRole] = useState<Role>(params.role === 'driver' ? 'driver' : 'customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const driver = role === 'driver';
  const problem = !name.trim()
    ? 'Enter your name'
    : !validEmail(email)
      ? 'Enter a valid email'
      : password.length < 8
        ? 'Password needs 8+ characters'
        : driver && !phone.trim()
          ? 'Drivers need a mobile number so customers can reach them'
          : null;

  const submit = async () => {
    setTouched(true);
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      const u = await signUp({
        role,
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        vehicle: vehicle.trim() || undefined,
      });
      // Customers go straight to "where should we plow?", drivers to their job board.
      router.replace(u.role === 'driver' ? '/driver' : '/order');
    } catch (e: any) {
      setError(e instanceof ApiError && e.status === 409 ? 'That email already has an account. Sign in instead.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ maxWidth: 460, gap: Spacing.three, paddingTop: Spacing.five }}>
        <Pressable onPress={() => router.replace('/')} accessibilityLabel="Back to home" style={{ alignSelf: 'flex-start' }}>
          <Brand />
        </Pressable>
        <View style={{ gap: Spacing.one, marginTop: Spacing.three }}>
          <T variant="title">Create your account</T>
          <T color="textSecondary">Takes about 30 seconds.</T>
        </View>

        <Row gap={Spacing.two}>
          <RoleCard icon="home" title="I need plowing" sub="Get my driveway cleared" selected={!driver} onPress={() => setRole('customer')} />
          <RoleCard icon="car" title="I drive a plow" sub="Earn on snow days" selected={driver} onPress={() => setRole('driver')} />
        </Row>

        <SocialSignIn role={role} onDone={({ user }) => router.replace(user.role === 'driver' ? '/driver' : '/order')} />

        <Input label="Name" value={name} onChangeText={setName} placeholder="First and last name" autoComplete="name" textContentType="name"
          invalid={touched && !name.trim()} />
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
          invalid={touched && !validEmail(email)} hint={touched && !validEmail(email) ? 'Enter a valid email' : null} />
        <Input label={driver ? 'Mobile phone' : 'Mobile phone (optional)'} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
          placeholder={driver ? 'So Plowbird can reach you. Customers never see it.' : 'For updates about your plow'} invalid={touched && driver && !phone.trim()} />
        {driver && <Input label="Truck & plow (optional)" value={vehicle} onChangeText={setVehicle} placeholder="e.g. 2020 Silverado 2500 · 8ft Fisher" />}
        <PasswordInput label="Create a password" value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword"
          placeholder="At least 8 characters" onSubmitEditing={submit} invalid={touched && password.length < 8}
          hint={password ? (password.length >= 8 ? '✓ Looks good' : `${8 - password.length} more character${password.length === 7 ? '' : 's'}`) : null} />

        <ErrorText>{error ?? (touched ? problem : null)}</ErrorText>
        <Button title={driver ? 'Create driver account' : 'Continue'} onPress={submit} loading={busy} />
        {!driver && (
          <T variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
            Next, enter your address to see your price.
          </T>
        )}
        <T variant="label" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.two }}>
          Already have an account?{' '}
          <Link href="/sign-in" replace style={{ color: '#F26B1D' }}>
            Sign in
          </Link>
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function RoleCard({ icon, title, sub, selected, onPress }: { icon: IconName; title: string; sub: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flex: 1,
        gap: 4,
        padding: Spacing.three,
        borderRadius: Radius.md,
        borderWidth: 2,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? theme.stormBg : theme.card,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Icon name={icon} color={selected ? 'primary' : 'textSecondary'} size={24} />
      <T variant="label">{title}</T>
      <T variant="caption" color="textSecondary">{sub}</T>
    </Pressable>
  );
}
