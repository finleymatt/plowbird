import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SIZE_LABEL } from '@/lib/format';
import type { PaymentMethods, Property, User } from '@/lib/types';
import { useApi } from '@/lib/use-api';

import { PaymentMethodCard } from './payment-method';
import { Button, Card, ErrorText, Icon, Input, Row, Screen, SectionTitle, T } from './ui';

export function AccountScreen() {
  const { user, setUser, signOut } = useAuth();
  const theme = useTheme();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [vehicle, setVehicle] = useState(user?.vehicle ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const props = useApi<Property[]>(user?.role === 'customer' ? '/properties' : null);
  const payment = useApi<PaymentMethods>(user?.role === 'customer' ? '/payments/methods' : null);
  const [demoStorm, setDemoStorm] = useState<boolean | null>(null);

  useEffect(() => {
    if (__DEV__) api<{ on: boolean }>('/dev/demo-storm').then((r) => setDemoStorm(r.on)).catch(() => {});
  }, []);

  if (!user) return null;
  const dirty = name !== user.name || phone !== (user.phone ?? '') || vehicle !== (user.vehicle ?? '');

  const save = async () => {
    setError(null);
    try {
      setUser(await api<User>('/me', { method: 'PATCH', body: { name, phone, vehicle } }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const remove = async (p: Property) => {
    setError(null);
    try {
      await api(`/properties/${p.id}`, { method: 'DELETE' });
      props.reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Screen>
      <T variant="title">Account</T>
      <T color="textSecondary">
        {user.email}
        {user.role === 'driver' && user.rating ? ` · ★ ${user.rating} (${user.ratingCount})` : ''}
      </T>

      <SectionTitle>Profile</SectionTitle>
      <View style={{ gap: Spacing.three }}>
        <Input label="Name" value={name} onChangeText={setName} />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {user.role === 'driver' && <Input label="Truck & plow" value={vehicle} onChangeText={setVehicle} />}
        {(dirty || saved) && <Button title={saved ? 'Saved' : 'Save changes'} size="md" icon={saved ? 'checkmark' : undefined} onPress={save} disabled={saved} />}
      </View>

      {user.role === 'customer' && (
        <>
          <SectionTitle action={<Button title="Add" size="sm" kind="ghost" icon="add" onPress={() => router.push('/customer/add-property')} />}>
            Driveways
          </SectionTitle>
          <View style={{ gap: Spacing.two }}>
            {props.data?.map((p) => (
              <Card key={p.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <T variant="label">{p.label}</T>
                    <T variant="caption" color="textSecondary" numberOfLines={1}>
                      {p.address} · {SIZE_LABEL[p.size]}
                    </T>
                  </View>
                  <Button title="Remove" kind="ghost" size="sm" onPress={() => remove(p)} />
                </Row>
              </Card>
            ))}
          </View>

          <SectionTitle>Payment</SectionTitle>
          <PaymentMethodCard methods={payment.data} onChange={payment.setData} />
        </>
      )}

      {__DEV__ && demoStorm !== null && (
        <>
          <SectionTitle>Developer</SectionTitle>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: Spacing.two }}>
                <Row>
                  <Icon name="thunderstorm-outline" color="warning" size={18} />
                  <T variant="label">Simulate a winter storm</T>
                </Row>
                <T variant="caption" color="textSecondary">{'Overlays a Winter Storm Warning and 9.5" forecast on live data, for testing off-season.'}</T>
              </View>
              <Switch
                value={demoStorm}
                onValueChange={async (on) => setDemoStorm((await api<{ on: boolean }>('/dev/demo-storm', { body: { on } })).on)}
                trackColor={{ true: theme.primary, false: theme.backgroundSelected }}
                thumbColor="#fff"
              />
            </Row>
          </Card>
        </>
      )}

      <ErrorText>{error}</ErrorText>
      <Button
        title="Sign out"
        kind="danger"
        style={{ marginTop: Spacing.five }}
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </Screen>
  );
}
