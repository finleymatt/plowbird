import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Brand } from '@/components/landing';
import { Button, Chip, ChipGroup, ErrorText, Input, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

export default function SignUp() {
  const params = useLocalSearchParams<{ role?: Role }>();
  const { signUp } = useAuth();
  const [role, setRole] = useState<Role>(params.role === 'driver' ? 'driver' : 'customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const u = await signUp({ role, name, email, password, phone: phone || undefined, vehicle: vehicle || undefined });
      router.replace(u.role === 'driver' ? '/driver' : '/customer/add-property');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ maxWidth: 440, gap: Spacing.three, paddingTop: Spacing.five }}>
        <Brand />
        <View style={{ gap: Spacing.one, marginTop: Spacing.four }}>
          <T variant="title">Create your account</T>
          <T color="textSecondary">{role === 'driver' ? 'Earn on every snow day with your truck and plow.' : 'Get your driveway cleared before you need to leave.'}</T>
        </View>
        <ChipGroup>
          <Chip label="I need plowing" icon="home" selected={role === 'customer'} onPress={() => setRole('customer')} />
          <Chip label="I plow snow" icon="car" selected={role === 'driver'} onPress={() => setRole('driver')} />
        </ChipGroup>
        <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Input label="Mobile phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="So your driver can reach you" />
        {role === 'driver' && (
          <Input label="Truck & plow" value={vehicle} onChangeText={setVehicle} placeholder="e.g. 2020 Silverado 2500 · 8ft Fisher" />
        )}
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" />
        <ErrorText>{error}</ErrorText>
        <Button title="Create account" onPress={submit} loading={busy} disabled={!name || !email || password.length < 8} />
        <T variant="label" color="textSecondary" style={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/sign-in" replace style={{ color: '#F26B1D' }}>
            Sign in
          </Link>
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}
