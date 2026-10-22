import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { JobRow, KindBadge } from '@/components/job-parts';
import { LiveMap, type MapPin } from '@/components/live-map';
import { Badge, Button, Card, ErrorText, Icon, Row, Screen, SectionTitle, T } from '@/components/ui';
import { StormBanner } from '@/components/weather';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth, useSocketEvent } from '@/lib/auth';
import { currentPosition, useDriverLocation } from '@/lib/driver-location';
import { isOpen, money, SIZE_LABEL } from '@/lib/format';
import type { Conditions, Job, User } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function DriverHome() {
  const { user, setUser } = useAuth();
  const theme = useTheme();
  const [online, setOnline] = useState(!!user?.online);
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { coords, permission } = useDriverLocation(online);

  const here = coords ?? (user?.lat != null ? { lat: user.lat, lng: user.lng! } : null);
  const mine = useApi<Job[]>('/jobs');
  const available = useApi<Job[]>(online ? '/driver/available' : null);
  const wx = useApi<Conditions>(here ? `/weather?lat=${here.lat.toFixed(2)}&lng=${here.lng.toFixed(2)}` : null);

  useSocketEvent('jobs:changed', () => online && available.reload());
  useSocketEvent('job', () => mine.reload());
  useSocketEvent('weather:changed', () => wx.reload());

  const toggle = async (next: boolean) => {
    setToggling(true);
    setError(null);
    try {
      const pos = next ? await currentPosition() : null;
      const u = await api<User>('/driver/status', { body: { online: next, ...(pos ?? {}) } });
      setUser(u);
      setOnline(u.online);
      if (next && !pos && u.lat == null) setError('Turn on location so we can show you nearby jobs.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setToggling(false);
    }
  };

  const accept = async (job: Job) => {
    setAccepting(job.id);
    setError(null);
    try {
      await api(`/jobs/${job.id}/accept`, { method: 'POST' });
      router.push({ pathname: '/driver/job/[id]', params: { id: String(job.id) } });
    } catch (e: any) {
      setError(e.message);
      available.reload();
    } finally {
      setAccepting(null);
    }
  };

  const active = (mine.data ?? []).filter((j) => isOpen(j.status));
  const pins: MapPin[] = [
    ...(here ? [{ id: 'me', kind: 'driver' as const, lat: here.lat, lng: here.lng, title: 'You' }] : []),
    ...(available.data ?? []).map((j) => ({ id: String(j.id), kind: 'job' as const, lat: j.property.lat, lng: j.property.lng, title: `${money(j.quote.driverPayout + j.tipCents)} · ${j.property.address}` })),
  ];

  // Not approved yet: no job board, just where the application stands.
  if (user?.driverStatus && user.driverStatus !== 'approved') return <ApplicationStatus status={user.driverStatus} />;
  // Approved, but the agreement or certificate of insurance is still outstanding.
  if (user?.driverStatus === 'approved' && user.driverReady === false) return <OnboardingStatus />;

  return (
    <Screen
      onRefresh={() => {
        mine.reload();
        available.reload();
        wx.reload();
      }}
      refreshing={false}
      contentStyle={{ gap: Spacing.three }}>
      <View>
        <T variant="caption" color="textSecondary">
          {user?.vehicle ?? 'Driver'}
        </T>
        <T variant="title">{user?.name.split(' ')[0]}</T>
      </View>

      <Card style={{ backgroundColor: online ? theme.success : theme.card, borderColor: online ? theme.success : theme.border }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T variant="heading" style={online ? { color: '#fff' } : undefined}>
              {online ? 'You’re online' : 'You’re offline'}
            </T>
            <T variant="caption" color={online ? undefined : 'textSecondary'} style={online ? { color: '#fff', opacity: 0.9 } : undefined}>
              {online ? 'Showing jobs within 30 miles. Your location is shared with customers on active jobs.' : 'Go online to see plow requests near you.'}
            </T>
          </View>
          <Switch value={online} disabled={toggling} onValueChange={toggle} trackColor={{ true: '#0B5E36', false: theme.backgroundSelected }} thumbColor="#fff" />
        </Row>
      </Card>
      {permission === 'denied' && online && <ErrorText>Location permission is off — customers won’t see you on the map.</ErrorText>}
      <ErrorText>{error}</ErrorText>

      {wx.data && <StormBanner wx={wx.data} />}
      {wx.data && ['significant', 'major'].includes(wx.data.stormLevel) && (
        <Row>
          <Icon name="trending-up" color="success" />
          <T variant="label" color="success">Storm pricing is on — jobs pay more right now.</T>
        </Row>
      )}

      {active.length > 0 && (
        <>
          <SectionTitle>Your jobs</SectionTitle>
          <View style={{ gap: Spacing.two }}>
            {active.map((j) => (
              <JobRow key={j.id} job={j} driverView onPress={() => router.push({ pathname: '/driver/job/[id]', params: { id: String(j.id) } })} />
            ))}
          </View>
        </>
      )}

      {online && (
        <>
          <SectionTitle>Available near you</SectionTitle>
          {pins.length > 0 && <LiveMap pins={pins} height={220} />}
          {available.data?.length === 0 && (
            <Card>
              <T color="textSecondary">No open requests right now. We’ll update this list the moment one comes in.</T>
            </Card>
          )}
          <View style={{ gap: Spacing.two }}>
            {available.data?.map((j) => (
              <Card key={j.id} style={{ gap: Spacing.two }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <KindBadge job={j} />
                  <T variant="title" color="success">
                    {money(j.quote.driverPayout + j.tipCents)}
                  </T>
                </Row>
                <T variant="label" numberOfLines={1}>
                  {j.property.address}
                </T>
                <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
                  {j.distanceMiles != null && <Badge label={`${j.distanceMiles} mi`} icon="navigate" />}
                  <Badge label={SIZE_LABEL[j.property.size]} icon="car" />
                  <Badge label={`${j.snowDepthIn}" snow`} icon="snow" />
                  {j.property.sidewalk && <Badge label="+ sidewalk" />}
                  {j.tipCents > 0 && <Badge label={`${money(j.tipCents)} tip`} tone="success" icon="heart" />}
                </Row>
                <Button
                  title={j.status === 'scheduled' ? 'Reserve this job' : 'Accept'}
                  size="md"
                  loading={accepting === j.id}
                  onPress={() => accept(j)}
                />
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function ApplicationStatus({ status }: { status: 'none' | 'pending' | 'rejected' }) {
  const copy = {
    none: { icon: 'document-text', title: 'Finish your application', body: 'Tell us about your truck, plow and insurance. It takes about 3 minutes, then we’ll give you a quick call.', cta: 'Finish application' },
    pending: { icon: 'time', title: 'Application under review', body: 'We’ll call you within 2 business days to check your insurance and plow. Set up payouts in Account meanwhile, so you’re ready for the first storm.', cta: 'View application' },
    rejected: { icon: 'alert-circle', title: 'Application not approved', body: 'We couldn’t approve your application. Check your notifications for details, or update it and apply again.', cta: 'Update application' },
  }[status];
  return (
    <Screen contentStyle={{ gap: Spacing.three }}>
      <Card style={{ gap: Spacing.three, alignItems: 'flex-start' }}>
        <Icon name={copy.icon as 'time'} size={36} color="accent" />
        <T variant="title">{copy.title}</T>
        <T color="textSecondary">{copy.body}</T>
        <Button title={copy.cta} onPress={() => router.push('/drive')} />
      </Card>
    </Screen>
  );
}

function OnboardingStatus() {
  return (
    <Screen contentStyle={{ gap: Spacing.three }}>
      <Card style={{ gap: Spacing.three, alignItems: 'flex-start' }}>
        <Icon name="create" size={36} color="accent" />
        <T variant="title">You’re approved. Finish your paperwork</T>
        <T color="textSecondary">
          Sign your contractor agreement and send us your certificate of insurance. Then your job board opens up and you can go online when it snows.
        </T>
        <Button title="Open my checklist" onPress={() => router.push('/driver-agreement' as Href)} />
      </Card>
    </Screen>
  );
}
