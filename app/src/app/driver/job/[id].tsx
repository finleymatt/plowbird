import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { KindBadge, QuoteLines, StatusBadge } from '@/components/job-parts';
import { LiveMap, type MapPin } from '@/components/live-map';
import { Badge, Button, Card, ErrorText, Icon, Loading, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAuth, useSocketEvent } from '@/lib/auth';
import { LENGTH_LABEL, SIZE_LABEL, when } from '@/lib/format';
import type { Job } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const NEXT_ACTION: Partial<Record<Job['status'], { title: string; icon: 'car' | 'snow' | 'checkmark-circle' }>> = {
  accepted: { title: 'Start driving', icon: 'car' },
  en_route: { title: 'I’ve arrived — start plowing', icon: 'snow' },
  in_progress: { title: 'Mark driveway clear', icon: 'checkmark-circle' },
};

function openDirections(lat: number, lng: number) {
  const url =
    Platform.OS === 'ios'
      ? `maps://?daddr=${lat},${lng}`
      : Platform.OS === 'android'
        ? `google.navigation:q=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));
}

export default function DriverJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: job, setData, error } = useApi<Job>(`/jobs/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const sim = useRef<ReturnType<typeof setInterval> | null>(null);

  useSocketEvent<Job>('job', (j) => {
    if (String(j.id) === id) setData(j);
  });
  useEffect(() => () => {
    if (sim.current) clearInterval(sim.current);
  }, []);

  if (!job) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;
  const mineJob = job.driver?.id === user?.id;

  const run = async (key: string, path: string) => {
    setBusy(key);
    setActionError(null);
    try {
      const j = await api<Job>(path, { method: 'POST' });
      setData(j);
      return j;
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(null);
    }
  };

  // Dev-only: glide the truck toward the driveway so you can watch tracking from a desk.
  const simulateDrive = () => {
    const start = job.driver?.lat != null ? { lat: job.driver.lat, lng: job.driver.lng! } : { lat: job.property.lat + 0.03, lng: job.property.lng - 0.03 };
    const end = { lat: job.property.lat, lng: job.property.lng };
    let step = 0;
    const steps = 12;
    setSimulating(true);
    sim.current = setInterval(() => {
      step++;
      const t = step / steps;
      api('/driver/location', { body: { lat: start.lat + (end.lat - start.lat) * t, lng: start.lng + (end.lng - start.lng) * t } }).catch(() => {});
      if (step >= steps && sim.current) {
        clearInterval(sim.current);
        setSimulating(false);
      }
    }, 1500);
  };

  const pins: MapPin[] = [{ id: 'home', kind: 'home', lat: job.property.lat, lng: job.property.lng, title: job.property.address }];
  if (job.driver?.lat != null) pins.push({ id: 'me', kind: 'driver', lat: job.driver.lat, lng: job.driver.lng!, title: 'You' });

  const action = NEXT_ACTION[job.status];
  const p = job.property;

  return (
    <Screen edges={[]} contentStyle={{ gap: Spacing.three }}>
      <Stack.Screen options={{ title: `Job #${job.id}` }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <StatusBadge status={job.status} />
        <KindBadge job={job} />
      </Row>
      <View>
        <T variant="title">{p.address}</T>
        <T color="textSecondary">
          {job.customer.name}
          {job.scheduledFor ? ` · ${when(job.scheduledFor)}` : ''}
        </T>
      </View>

      <LiveMap pins={pins} height={240} />

      <Row gap={Spacing.two}>
        <Button title="Directions" icon="navigate" kind="secondary" size="md" style={{ flex: 1 }} onPress={() => openDirections(p.lat, p.lng)} />
        {mineJob && job.customer.phone && (
          <Button title="Call" icon="call" kind="secondary" size="md" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${job.customer.phone}`)} />
        )}
      </Row>

      <Card style={{ gap: Spacing.two }}>
        <T variant="heading">Driveway</T>
        <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
          <Badge label={SIZE_LABEL[p.size]} icon="car" />
          <Badge label={`${LENGTH_LABEL[p.length]} length`} />
          <Badge label={`${job.snowDepthIn}" snow`} icon="snow" />
          {p.sidewalk && <Badge label="Sidewalk too" tone="warning" icon="walk" />}
        </Row>
        {(job.notes || p.notes) && (
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="chatbubble-ellipses-outline" color="accent" size={18} />
            <T style={{ flex: 1 }}>{job.notes || p.notes}</T>
          </Row>
        )}
      </Card>

      <SectionTitle>Your pay</SectionTitle>
      <Card>
        <QuoteLines quote={job.quote} tipCents={job.tipCents} driverView />
      </Card>

      <ErrorText>{actionError}</ErrorText>

      {!mineJob && ['requested', 'scheduled'].includes(job.status) && (
        <Button title={job.status === 'scheduled' ? 'Reserve this job' : 'Accept job'} loading={busy === 'accept'} onPress={() => run('accept', `/jobs/${job.id}/accept`)} />
      )}

      {mineJob && action && (
        <Button title={action.title} icon={action.icon} loading={busy === 'advance'} onPress={() => run('advance', `/jobs/${job.id}/advance`)} />
      )}

      {mineJob && job.status === 'scheduled' && (
        <Card>
          <T color="textSecondary">You’ve reserved this job. It moves to your active list 45 minutes before {when(job.scheduledFor)}.</T>
        </Card>
      )}

      {mineJob && job.status === 'completed' && (
        <Card style={{ gap: Spacing.two }}>
          <Row>
            <Icon name="checkmark-circle" color="success" />
            <T variant="heading">Nice work!</T>
          </Row>
          <T color="textSecondary">{job.rating ? `${job.customer.name.split(' ')[0]} rated you ${job.rating}★.` : 'The customer can still rate and tip.'}</T>
          <Button title="Back to jobs" size="md" kind="secondary" onPress={() => router.navigate('/driver')} />
        </Card>
      )}

      {mineJob && __DEV__ && ['accepted', 'en_route'].includes(job.status) && (
        <Button title={simulating ? 'Simulating drive…' : 'Simulate drive to driveway (dev)'} kind="ghost" size="sm" disabled={simulating} onPress={simulateDrive} />
      )}

      {mineJob && ['scheduled', 'accepted'].includes(job.status) && (
        <Button
          title="Release job"
          kind="danger"
          size="md"
          loading={busy === 'release'}
          onPress={async () => {
            if (await run('release', `/jobs/${job.id}/cancel`)) router.navigate('/driver');
          }}
        />
      )}
    </Screen>
  );
}
