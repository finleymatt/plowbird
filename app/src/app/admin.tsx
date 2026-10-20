import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/landing';
import { Badge, Button, Card, ErrorText, Icon, Input, Row, T } from '@/components/ui';
import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AdminSummary, DriverForReview, DriverStatus } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// Staff page: launch numbers and driver applications to approve. Only for ADMIN_EMAILS.

const TABS: { key: DriverStatus; label: string }[] = [
  { key: 'pending', label: 'To review' },
  { key: 'approved', label: 'Approved' },
  { key: 'none', label: 'No application' },
  { key: 'rejected', label: 'Rejected' },
];
const PLOW: Record<string, string> = { straight: 'straight blade', v: 'V-plow', wing: 'wing plow', box: 'box pusher', other: 'plow' };
const TIME: Record<string, string> = { overnight: 'overnight', early_morning: 'early morning', weekdays: 'weekdays', weekends: 'weekends' };
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function AdminScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { user, loading } = useAuth();
  const staff = !!user?.admin;
  const [tab, setTab] = useState<DriverStatus>('pending');
  const summary = useApi<AdminSummary>(staff ? '/admin/summary' : null);
  const drivers = useApi<DriverForReview[]>(staff ? `/admin/drivers?status=${tab}` : null);

  const s = summary.data;
  const stats: { label: string; value: string | number; sub?: string }[] = s
    ? [
        { label: 'Approved drivers', value: s.drivers.approved, sub: `${s.driversOnline} online now` },
        { label: 'To review', value: s.drivers.pending, sub: `${s.drivers.none} started, no application` },
        { label: 'Customers', value: s.customers, sub: `+${s.customersThisWeek} this week` },
        { label: 'Orders this week', value: s.jobsThisWeek, sub: `${s.jobs.completed ?? 0} completed all time` },
        { label: 'FIRSTPLOW used', value: s.promoRedemptions },
        { label: 'Storm Passes', value: s.stormPasses },
      ]
    : [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 1120, alignSelf: 'center', padding: wide ? Spacing.five : Spacing.three, gap: Spacing.four }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.replace('/')} accessibilityLabel="Plowbird home">
            <Brand />
          </Pressable>
          <Badge label="STAFF" tone="accent" icon="shield-checkmark" />
        </Row>

        {loading ? null : !user ? (
          <Card style={{ gap: Spacing.three, alignItems: 'flex-start' }}>
            <T variant="heading">Sign in to continue</T>
            <Button title="Sign in" kind="dark" onPress={() => router.push('/sign-in')} />
          </Card>
        ) : !staff ? (
          <Card style={{ gap: Spacing.two }}>
            <T variant="heading">Staff only</T>
            <T color="textSecondary">This page is for the Plowbird team. Ask an admin to add your email to ADMIN_EMAILS on the server.</T>
          </Card>
        ) : (
          <>
            <T variant="title">Launch dashboard</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
              {stats.map((x) => (
                <Card key={x.label} raised style={{ flexBasis: wide ? '30%' : '46%', flexGrow: 1, gap: 2 }}>
                  <T variant="caption" color="textSecondary">{x.label}</T>
                  <T style={[{ fontSize: 30, letterSpacing: -1 }, font('800')]}>{x.value}</T>
                  {x.sub && <T variant="caption" color="textSecondary">{x.sub}</T>}
                </Card>
              ))}
            </View>

            <T variant="heading" style={{ fontSize: 22 }}>Drivers</T>
            <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
              {TABS.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t.key }}
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 2, borderColor: tab === t.key ? theme.accent : theme.border, backgroundColor: tab === t.key ? theme.ice : theme.card }}>
                  <T variant="label">
                    {t.label}
                    {s ? ` · ${s.drivers[t.key]}` : ''}
                  </T>
                </Pressable>
              ))}
            </Row>
            {drivers.data?.length === 0 && <T color="textSecondary">Nobody here yet.</T>}
            {(drivers.data ?? []).map((d) => (
              <DriverCard
                key={d.id}
                d={d}
                onChange={() => {
                  drivers.reload();
                  summary.reload();
                }}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DriverCard({ d, onChange }: { d: DriverForReview; onChange: () => void }) {
  const theme = useTheme();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const a = d.application;

  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(decision);
    setError(null);
    try {
      await api(`/admin/drivers/${d.id}/${decision}`, { body: { note: note.trim() || undefined } });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const facts: [string, string][] = a
    ? [
        ['Area', `${a.zip} · up to ${a.radiusMiles} mi`],
        ['Truck', a.truck],
        ['Plow', `${a.plowWidthFt ? `${a.plowWidthFt} ft ` : ''}${PLOW[a.plowType] ?? 'plow'}`],
        ['Experience', a.yearsPlowing ? `${a.yearsPlowing}+ years` : 'New to plowing'],
        ['Available', a.availability.map((x) => TIME[x] ?? x).join(', ')],
        ['Insurance', `${a.insured ? 'Says yes' : 'No'}${a.insuranceCarrier ? ` · ${a.insuranceCarrier}` : ''}`],
        ['Walks too', a.shovel ? 'Yes' : 'No'],
        ...(a.heardFrom ? ([['Heard from', a.heardFrom]] as [string, string][]) : []),
        ...(a.notes ? ([['Notes', a.notes]] as [string, string][]) : []),
      ]
    : [];

  return (
    <Card style={{ gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="heading">{d.name}</T>
          <T variant="caption" color="textSecondary">
            {d.email} · signed up {day(d.createdAt)}
            {a?.submittedAt ? ` · applied ${day(a.submittedAt)}` : ''}
            {d.completedJobs ? ` · ${d.completedJobs} jobs done` : ''}
            {d.rating ? ` · ★ ${d.rating}` : ''}
          </T>
        </View>
        {d.phone && (
          <Button title={d.phone} icon="call" kind="secondary" size="sm" onPress={() => Linking.openURL(`tel:${d.phone!.replace(/[^\d+]/g, '')}`)} />
        )}
      </Row>
      {a ? (
        <View style={{ gap: 6 }}>
          {facts.map(([k, v]) => (
            <Row key={k} style={{ alignItems: 'flex-start' }}>
              <T variant="caption" color="textSecondary" style={{ width: 92 }}>{k}</T>
              <T variant="caption" style={{ flex: 1 }}>{v}</T>
            </Row>
          ))}
        </View>
      ) : (
        <T variant="caption" color="textSecondary">Created an account but hasn’t applied yet.</T>
      )}
      {d.note && (
        <Row style={{ backgroundColor: theme.backgroundElement, padding: Spacing.two, borderRadius: Radius.md }}>
          <Icon name="document-text" size={16} color="textSecondary" />
          <T variant="caption" style={{ flex: 1 }}>Note: {d.note}</T>
        </Row>
      )}
      {a && (
        <>
          <Input value={note} onChangeText={setNote} placeholder={d.status === 'approved' ? 'Reason (sent to the driver if you reject)' : 'Note (optional, sent to the driver)'} />
          <ErrorText>{error}</ErrorText>
          <Row gap={Spacing.two}>
            {d.status !== 'approved' && <Button title="Approve" icon="checkmark" onPress={() => decide('approve')} loading={busy === 'approve'} style={{ flex: 1 }} />}
            {d.status !== 'rejected' && (
              <Button title={d.status === 'approved' ? 'Remove driver' : 'Reject'} kind="danger" onPress={() => decide('reject')} loading={busy === 'reject'} style={{ flex: 1 }} />
            )}
          </Row>
        </>
      )}
    </Card>
  );
}
