import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Brand } from '@/components/landing';
import { SocialSignIn } from '@/components/social-sign-in';
import { Button, ErrorText, Input, PasswordInput, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const u = await signIn(email, password);
      router.replace(u.role === 'driver' ? '/driver' : '/customer');
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
          <T variant="title">Welcome back</T>
          <T color="textSecondary">Sign in to request a plow or start driving.</T>
        </View>
        <SocialSignIn onDone={({ user }) => router.replace(user.role === 'driver' ? '/driver' : '/customer')} />
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <PasswordInput label="Password" value={password} onChangeText={setPassword} autoComplete="password" textContentType="password" onSubmitEditing={submit} />
        <ErrorText>{error}</ErrorText>
        <Button title="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />
        <T variant="label" color="textSecondary" style={{ textAlign: 'center' }}>
          New here?{' '}
          <Link href="/sign-up" replace style={{ color: '#F26B1D' }}>
            Create an account
          </Link>
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}
