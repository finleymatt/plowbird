import { useState } from 'react';
import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';

import { Button, Card, ErrorText, Icon, Input, Row, T } from './ui';

// "Know a plow driver?" Goes to POST /drive/recommend, which adds them to /admin → Outreach → Drivers.
export function RecommendDriver() {
  const theme = useTheme();
  const [f, setF] = useState({ driverName: '', phone: '', email: '', area: '', notes: '', yourName: '', yourContact: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/drive/recommend', { body: f });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <Card style={{ gap: Spacing.two }}>
        <Row>
          <Icon name="checkmark-circle" color="success" />
          <T variant="heading" style={{ flex: 1 }}>Thanks! We’ll reach out to {f.driverName.split(/\s+/)[0]}.</T>
        </Row>
        <T color="textSecondary">We’ll mention you sent us. Know another one?</T>
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            title="Recommend someone else"
            kind="secondary"
            size="sm"
            onPress={() => {
              setF((x) => ({ ...x, driverName: '', phone: '', email: '', area: '', notes: '' }));
              setSent(false);
            }}
          />
        </View>
      </Card>
    );

  const half = { flexGrow: 1, flexBasis: 220 } as const;
  const input = { backgroundColor: theme.background };
  return (
    <Card style={{ gap: Spacing.three }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: theme.ice, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="people" color="accent" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="heading">Know someone with a plow truck?</T>
          <T color="textSecondary">A neighbor, a landscaper, a friend with a plow on their pickup. Send them our way and we’ll give them a call.</T>
        </View>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        <View style={{ flexBasis: '100%' }}>
          <Input label="Their name or business" value={f.driverName} onChangeText={set('driverName')} placeholder="e.g. Jake’s Lawn & Snow" style={input} />
        </View>
        <View style={half}>
          <Input label="Their phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="612-555-0123" style={input} />
        </View>
        <View style={half}>
          <Input label="Or their email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" style={input} />
        </View>
        <View style={half}>
          <Input label="Where they plow (optional)" value={f.area} onChangeText={set('area')} placeholder="Plymouth, Wayzata…" style={input} />
        </View>
        <View style={half}>
          <Input label="Anything we should know? (optional)" value={f.notes} onChangeText={set('notes')} placeholder="Has a V-plow, does commercial lots…" style={input} />
        </View>
        <View style={half}>
          <Input label="Your name (optional)" value={f.yourName} onChangeText={set('yourName')} placeholder="So we can say who sent us" style={input} />
        </View>
        <View style={half}>
          <Input label="Your phone or email (optional)" value={f.yourContact} onChangeText={set('yourContact')} autoCapitalize="none" placeholder="In case we have questions" style={input} />
        </View>
      </View>
      <T variant="caption" color="textSecondary">Only share contact info you have permission to pass along. We’ll call or email them once and mention you.</T>
      <ErrorText>{error}</ErrorText>
      <Button title="Send recommendation" icon="send" onPress={submit} loading={busy} />
    </Card>
  );
}
