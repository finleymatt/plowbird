import { router } from 'expo-router';
import { View } from 'react-native';

import { JobRow } from '@/components/job-parts';
import { Card, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSocketEvent } from '@/lib/auth';
import { isOpen } from '@/lib/format';
import type { Job } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function Orders() {
  const { data, loading, reload } = useApi<Job[]>('/jobs');
  useSocketEvent('job', reload);
  if (loading && !data) return <Loading />;

  const open = (data ?? []).filter((j) => isOpen(j.status));
  const past = (data ?? []).filter((j) => !isOpen(j.status));
  const go = (j: Job) => router.push({ pathname: '/customer/job/[id]', params: { id: String(j.id) } });

  return (
    <Screen onRefresh={reload} refreshing={false}>
      <T variant="title">Orders</T>
      {!data?.length && (
        <Card style={{ marginTop: Spacing.four }}>
          <T color="textSecondary">No plows yet. When snow’s coming, request or schedule one from Home.</T>
        </Card>
      )}
      {open.length > 0 && <SectionTitle>Upcoming & active</SectionTitle>}
      <View style={{ gap: Spacing.two }}>
        {open.map((j) => (
          <JobRow key={j.id} job={j} onPress={() => go(j)} />
        ))}
      </View>
      {past.length > 0 && <SectionTitle>Past</SectionTitle>}
      <View style={{ gap: Spacing.two }}>
        {past.map((j) => (
          <JobRow key={j.id} job={j} onPress={() => go(j)} />
        ))}
      </View>
    </Screen>
  );
}
