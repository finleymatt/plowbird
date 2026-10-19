import { View } from 'react-native';

import { Card, Loading, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSocketEvent } from '@/lib/auth';
import { money, moneyExact, when } from '@/lib/format';
import type { Earnings } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function EarningsScreen() {
  const { data, reload } = useApi<Earnings>('/driver/earnings');
  useSocketEvent('job', reload);
  if (!data) return <Loading />;

  return (
    <Screen onRefresh={reload} refreshing={false}>
      <T variant="title">Earnings</T>
      <Card style={{ marginTop: Spacing.three, gap: 4 }}>
        <T variant="caption" color="textSecondary">Today</T>
        <T variant="number" color="success">{moneyExact(data.today.cents)}</T>
        <T variant="caption" color="textSecondary">
          {data.today.jobs} job{data.today.jobs === 1 ? '' : 's'} · {money(data.today.tips)} in tips
        </T>
      </Card>
      <Row gap={Spacing.two} style={{ marginTop: Spacing.two }}>
        <Stat label="Last 7 days" cents={data.week.cents} jobs={data.week.jobs} />
        <Stat label="All time" cents={data.allTime.cents} jobs={data.allTime.jobs} />
      </Row>
      <T variant="caption" color="textSecondary" style={{ marginTop: Spacing.two }}>
        You keep 80% of every job and 100% of tips. Payouts are simulated in this build.
      </T>

      <SectionTitle>Recent jobs</SectionTitle>
      {!data.recent.length && (
        <Card>
          <T color="textSecondary">Completed jobs will show up here.</T>
        </Card>
      )}
      <View style={{ gap: Spacing.two }}>
        {data.recent.map((r) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: Spacing.two }}>
                <T variant="label" numberOfLines={1}>{r.address}</T>
                <T variant="caption" color="textSecondary">
                  {when(r.completedAt)}
                  {r.rating ? ` · ${r.rating}★` : ''}
                  {r.tipCents ? ` · ${money(r.tipCents)} tip` : ''}
                </T>
              </View>
              <T variant="heading">{moneyExact(r.payoutCents + r.tipCents)}</T>
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ label, cents, jobs }: { label: string; cents: number; jobs: number }) {
  return (
    <Card style={{ flex: 1, gap: 2 }}>
      <T variant="caption" color="textSecondary">{label}</T>
      <T variant="title">{money(cents)}</T>
      <T variant="caption" color="textSecondary">{jobs} job{jobs === 1 ? '' : 's'}</T>
    </Card>
  );
}
