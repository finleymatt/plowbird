import { router } from 'expo-router';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { money, when } from '@/lib/format';
import type { StormPass } from '@/lib/types';

import { Button, Card, Icon, Row, T } from './ui';

// Customer home: Storm Pass status for this driveway, or the pitch if it doesn't have one.
export function StormPassCard({ propertyId, passes }: { propertyId: number; passes: StormPass[] | null }) {
  const theme = useTheme();
  const pass = passes?.find((p) => p.propertyId === propertyId && p.status !== 'cancelled');

  if (pass)
    return (
      <Card onPress={() => router.push('/storm-pass')} style={{ gap: Spacing.two, backgroundColor: theme.ice }}>
        <Row>
          <Icon name="snow" color="accent" />
          <T variant="heading" style={{ flex: 1 }}>Storm Pass {pass.status === 'ending' ? 'ending' : 'active'}</T>
          <Icon name="chevron-forward" color="textSecondary" />
        </Row>
        <T color="textSecondary">
          {pass.status === 'ending'
            ? `Covered until ${when(pass.endsAt)}.`
            : `We’ll plow automatically every qualifying storm. ${money(pass.priceCents)}/mo${pass.renewsAt ? `, renews ${when(pass.renewsAt)}` : ''}.`}
        </T>
      </Card>
    );

  return (
    <Card style={{ gap: Spacing.three, backgroundColor: theme.inverse }}>
      <Row>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="snow" color="primaryText" />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="heading" style={{ color: theme.inverseText }}>Never shovel again</T>
          <T variant="caption" style={{ color: theme.inverseText, opacity: 0.8 }}>Storm Pass plows you automatically every storm. From $79/mo.</T>
        </View>
      </Row>
      <Button title="See Storm Pass" size="md" onPress={() => router.push('/storm-pass')} />
    </Card>
  );
}
