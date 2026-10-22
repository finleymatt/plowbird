import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/landing';
import { Badge, Button, Card, ErrorText, Icon, Input, Row, T, type IconName } from '@/components/ui';
import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Outreach } from '@/components/outreach-admin';
import { money } from '@/lib/format';
import type { AdminSummary, DriverForReview, DriverStatus, Kpis, Lead } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// Staff page: launch KPIs, the waitlist, and driver applications to approve. Only for ADMIN_EMAILS.

type Section = 'dashboard' | 'waitlist' | 'outreach' | 'drivers';
const SECTIONS: { key: Section; label: string; icon: IconName }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'stats-chart' },
  { key: 'waitlist', label: 'Waitlist', icon: 'mail' },
  { key: 'outreach', label: 'Outreach', icon: 'people' },
  { key: 'drivers', label: 'Drivers', icon: 'car' },
];

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
  const [section, setSection] = useState<Section>('dashboard');
  const [tab, setTab] = useState<DriverStatus>('pending');
  const summary = useApi<AdminSummary>(staff ? '/admin/summary' : null);
  const drivers = useApi<DriverForReview[]>(staff && section === 'drivers' ? `/admin/drivers?status=${tab}` : null);
  const s = summary.data;

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
            <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
              {SECTIONS.map((x) => (
                <Pressable
                  key={x.key}
                  onPress={() => setSection(x.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: section === x.key }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.pill, backgroundColor: section === x.key ? theme.inverse : theme.backgroundElement }}>
                  <Icon name={x.icon} size={16} color={section === x.key ? 'inverseText' : 'text'} />
                  <T variant="label" color={section === x.key ? 'inverseText' : 'text'}>{x.label}</T>
                </Pressable>
              ))}
            </Row>
            {section === 'dashboard' && <Dashboard wide={wide} />}
            {section === 'waitlist' && <Waitlist wide={wide} />}
            {section === 'outreach' && <Outreach wide={wide} />}
            {section === 'drivers' && (<>
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
            </>)}
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
        ['Auto insurance', `${a.insured ? 'Says yes' : 'No'}${a.insuranceCarrier ? ` · ${a.insuranceCarrier}` : ''}${a.insuranceExpires ? ` · renews ${a.insuranceExpires}` : ''}`],
        ['Liability', a.liabilityInsured ? 'Says yes' : 'Not stated'],
        ['License', a.licenseState ? `${a.licenseState} · expires ${a.licenseExpires}` : 'Not given'],
        ['Works as', a.businessName ?? 'Individual'],
        ['Signed', a.signature ? `${a.signature}${a.signedAt ? ` · ${day(a.signedAt)}` : ''}${a.termsVersion ? ` · terms ${a.termsVersion}` : ''}` : 'Not signed (older application)'],
        ['Texts OK', a.smsConsent ? 'Yes' : 'No'],
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
      {d.status === 'approved' && <Onboarding d={d} onChange={onChange} />}
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

/* ---------------- dashboard ---------------- */

const RANGES = [7, 30, 90];
const pct = (x: number | null) => (x == null ? '–' : `${Math.round(x * 100)}%`);
const mins = (x: number | null) => (x == null ? '–' : x < 60 ? `${Math.round(x)} min` : `${(x / 60).toFixed(1)} h`);

type Stat = { label: string; value: string | number; sub?: string; tone?: 'good' | 'bad' };

function Dashboard({ wide }: { wide: boolean }) {
  const theme = useTheme();
  const [days, setDays] = useState(30);
  const k = useApi<Kpis>(`/admin/kpis?days=${days}`).data;
  if (!k) return <T color="textSecondary">Loading…</T>;

  const groups: { title: string; hint: string; stats: Stat[] }[] = [
    {
      title: 'Demand',
      hint: 'Is the marketing working?',
      stats: [
        { label: 'Waitlist', value: k.waitlist.total, sub: `+${k.waitlist.thisWeek} this week` },
        { label: 'Waitlist → customer', value: pct(k.waitlist.total ? k.waitlist.converted / k.waitlist.total : null), sub: `${k.waitlist.converted} signed up` },
        { label: 'Customers', value: k.customers.total, sub: `+${k.customers.thisWeek} this week` },
        { label: 'Orders', value: k.orders.total, sub: `${k.orders.scheduled} scheduled · ${k.orders.stormAuto} storm auto` },
      ],
    },
    {
      title: 'Reliability',
      hint: 'Does every order get a plow?',
      stats: [
        { label: 'Fill rate', value: pct(k.orders.fillRate), sub: 'orders that got a driver', tone: k.orders.fillRate == null ? undefined : k.orders.fillRate >= 0.9 ? 'good' : 'bad' },
        { label: 'No driver (timed out)', value: k.orders.timedOut, tone: k.orders.timedOut ? 'bad' : undefined },
        { label: 'Time to accept', value: mins(k.orders.medianMinutesToAccept), sub: 'median' },
        { label: 'Accept → cleared', value: mins(k.orders.medianMinutesToClear), sub: 'median' },
      ],
    },
    {
      title: 'Supply',
      hint: 'Enough drivers?',
      stats: [
        { label: 'Approved drivers', value: k.drivers.approved, sub: `${k.drivers.pending} to review` },
        { label: 'Online now', value: k.drivers.online },
        { label: 'Active this week', value: k.drivers.activeThisWeek, sub: 'completed a job' },
        { label: 'Orders per driver', value: k.drivers.activeThisWeek ? (k.orders.completed / k.drivers.activeThisWeek).toFixed(1) : '–', sub: `${days}-day completed ÷ active` },
      ],
    },
    {
      title: 'Money',
      hint: `Completed orders, last ${days} days`,
      stats: [
        { label: 'Gross bookings', value: money(k.money.gmvCents), sub: 'price + tips' },
        { label: 'Plowbird revenue', value: money(k.money.revenueCents), sub: 'before Stripe fees' },
        { label: 'Paid to drivers', value: money(k.money.driverEarningsCents), sub: `${money(k.money.tipsCents)} in tips` },
        { label: 'Avg order', value: k.money.avgOrderCents == null ? '–' : money(k.money.avgOrderCents), sub: `${money(k.money.promoCostCents)} promo cost` },
      ],
    },
    {
      title: 'Retention',
      hint: 'Do they come back?',
      stats: [
        { label: 'Repeat customers', value: pct(k.customers.repeatRate), sub: `of ${k.customers.ordered} who ordered` },
        { label: 'Avg rating', value: k.customers.avgRating ?? '–', sub: `${k.customers.ratings} ratings` },
        { label: 'Storm Passes', value: k.customers.stormPasses },
        { label: 'Storm Pass MRR', value: money(k.money.stormPassMrrCents), sub: 'monthly recurring' },
      ],
    },
    {
      title: 'Referrals',
      hint: 'Is word of mouth working?',
      stats: [
        { label: 'Referred sign-ups', value: k.referrals.total, sub: 'all time' },
        { label: 'Referrals booked', value: k.referrals.qualifiedInWindow, sub: `${k.referrals.qualified} all time` },
        { label: 'Credit used', value: money(k.money.creditSpentCents), sub: `last ${days} days` },
        { label: 'Credit outstanding', value: money(k.money.creditOutstandingCents), sub: 'owed on future plows' },
      ],
    },
  ];
  const max = Math.max(1, ...k.daily.map((d) => d.leads + d.signups + d.orders));

  return (
    <View style={{ gap: Spacing.four }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two }}>
        <View>
          <T variant="title">Launch dashboard</T>
          <T variant="caption" color="textSecondary">
            {k.serviceZips.length ? `Service area: ${k.serviceZips.join(', ')}` : 'Service area: everywhere (SERVICE_ZIPS not set)'}
          </T>
        </View>
        <Row gap={Spacing.one}>
          {RANGES.map((r) => (
            <Pressable key={r} onPress={() => setDays(r)} accessibilityRole="radio" accessibilityState={{ selected: days === r }}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 2, borderColor: days === r ? theme.accent : theme.border, backgroundColor: days === r ? theme.ice : theme.card }}>
              <T variant="caption" style={font('700')}>{r} days</T>
            </Pressable>
          ))}
        </Row>
      </Row>

      {groups.map((g) => (
        <View key={g.title} style={{ gap: Spacing.two }}>
          <Row gap={Spacing.two} style={{ alignItems: 'baseline' }}>
            <T variant="heading" style={{ fontSize: 18 }}>{g.title}</T>
            <T variant="caption" color="textSecondary">{g.hint}</T>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
            {g.stats.map((x) => (
              <Card key={x.label} raised style={{ flexBasis: wide ? '22%' : '46%', flexGrow: 1, gap: 2 }}>
                <T variant="caption" color="textSecondary">{x.label}</T>
                <T color={x.tone === 'bad' ? 'danger' : x.tone === 'good' ? 'success' : 'text'} style={[{ fontSize: 28, letterSpacing: -1 }, font('800')]}>{x.value}</T>
                {x.sub && <T variant="caption" color="textSecondary">{x.sub}</T>}
              </Card>
            ))}
          </View>
        </View>
      ))}

      <Card raised style={{ gap: Spacing.three }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two }}>
          <T variant="heading" style={{ fontSize: 18 }}>Last 14 days</T>
          <Row gap={Spacing.three}>
            {([['Waitlist', theme.accent], ['Sign-ups', theme.success], ['Orders', theme.primary]] as const).map(([l, c]) => (
              <Row key={l} gap={6}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
                <T variant="caption" color="textSecondary">{l}</T>
              </Row>
            ))}
          </Row>
        </Row>
        <Row gap={4} style={{ alignItems: 'flex-end', height: 120 }}>
          {k.daily.map((d) => (
            <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessibilityLabel={`${d.day}: ${d.leads} waitlist, ${d.signups} sign-ups, ${d.orders} orders`}>
              <View style={{ width: '70%', height: 100, justifyContent: 'flex-end' }}>
                <View style={{ height: (d.orders / max) * 100, backgroundColor: theme.primary, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                <View style={{ height: (d.signups / max) * 100, backgroundColor: theme.success }} />
                <View style={{ height: (d.leads / max) * 100, backgroundColor: theme.accent }} />
              </View>
              <T variant="caption" color="textSecondary" style={{ fontSize: 10 }}>{d.day.slice(8)}</T>
            </View>
          ))}
        </Row>
      </Card>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: Spacing.three }}>
        <MiniTable title="Waitlist by ZIP" empty="No ZIPs yet" rows={k.waitlist.topZips.map((z) => [z.zip + (z.inArea ? '' : '  · outside'), String(z.n)])} />
        <MiniTable title="Waitlist by source" empty="No sign-ups yet" rows={k.waitlist.sources.map((x) => [x.source, String(x.n)])} />
        <MiniTable title={`Top drivers (${days} days)`} empty="No completed jobs yet" rows={k.drivers.top.map((d) => [d.name, `${d.jobs} jobs${d.rating ? ` · ★ ${d.rating}` : ''}`])} />
      </View>
    </View>
  );
}

function MiniTable({ title, rows, empty }: { title: string; rows: [string, string][]; empty: string }) {
  const theme = useTheme();
  return (
    <Card raised style={{ flex: 1, gap: Spacing.two }}>
      <T variant="label">{title}</T>
      {rows.length === 0 && <T variant="caption" color="textSecondary">{empty}</T>}
      {rows.map(([a, b], i) => (
        <Row key={a + i} style={{ justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: i ? 1 : 0, borderColor: theme.border }}>
          <T variant="caption" style={{ flex: 1 }}>{a}</T>
          <T variant="caption" style={font('700')}>{b}</T>
        </Row>
      ))}
    </Card>
  );
}

/* ---------------- waitlist ---------------- */

const AREA_FILTERS: { key: '' | '1' | '0'; label: string }[] = [
  { key: '', label: 'Everyone' },
  { key: '1', label: 'In service area' },
  { key: '0', label: 'Outside (coming soon)' },
];
const csvCell = (v: unknown) => {
  const s = v == null ? '' : /^[=+\-@]/.test(String(v)) ? `'${v}` : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function Waitlist({ wide }: { wide: boolean }) {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [area, setArea] = useState<'' | '1' | '0'>('');
  const leads = useApi<Lead[]>(`/admin/leads?q=${encodeURIComponent(q.trim())}${area ? `&inArea=${area}` : ''}`);
  const rows = leads.data ?? [];

  const download = () => {
    const cols: (keyof Lead)[] = ['email', 'phone', 'address', 'zip', 'inArea', 'source', 'utm_source', 'utm_campaign', 'promo', 'converted', 'completed_jobs', 'created_at'];
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `plowbird-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two }}>
        <View>
          <T variant="title">Waitlist</T>
          <T variant="caption" color="textSecondary">Storm-alert sign-ups, people outside the service area, and orders that timed out.</T>
        </View>
        {Platform.OS === 'web' && rows.length > 0 && <Button title="Download CSV" icon="download" kind="secondary" size="sm" onPress={download} />}
      </Row>
      <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
        <View style={{ flexGrow: 1, flexBasis: 240 }}>
          <Input value={q} onChangeText={setQ} placeholder="Search email, address or ZIP" autoCapitalize="none" />
        </View>
        {AREA_FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setArea(f.key)} accessibilityRole="radio" accessibilityState={{ selected: area === f.key }}
            style={{ justifyContent: 'center', paddingHorizontal: 14, minHeight: 44, borderRadius: Radius.pill, borderWidth: 2, borderColor: area === f.key ? theme.accent : theme.border, backgroundColor: area === f.key ? theme.ice : theme.card }}>
            <T variant="label">{f.label}</T>
          </Pressable>
        ))}
      </Row>
      <T variant="caption" color="textSecondary">{leads.loading && !leads.data ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'person' : 'people'}${rows.length === 1000 ? ' (first 1,000)' : ''}`}</T>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {wide && (
          <Row style={{ paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, backgroundColor: theme.backgroundElement }}>
            {['Contact', 'Address', 'Source', 'Joined'].map((h, i) => (
              <T key={h} variant="caption" color="textSecondary" style={[{ flex: [2, 2.4, 1.2, 0.8][i] }, font('700')]}>{h}</T>
            ))}
          </Row>
        )}
        {rows.length === 0 && !leads.loading && <T color="textSecondary" style={{ padding: Spacing.three }}>Nobody on the list yet.</T>}
        {rows.map((r, i) => (
          <View key={r.id} style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 0 : 4, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderTopWidth: i ? 1 : 0, borderColor: theme.border }}>
            <View style={{ flex: wide ? 2 : undefined }}>
              <T variant="label" selectable>{r.email}</T>
              {r.phone && <T variant="caption" color="textSecondary" selectable>{r.phone}</T>}
            </View>
            <View style={{ flex: wide ? 2.4 : undefined, gap: 4 }}>
              <T variant="caption" selectable>{r.address ?? (r.zip ? `ZIP ${r.zip}` : '–')}</T>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {r.inArea === true && <Badge label="IN AREA" tone="success" />}
                {r.inArea === false && <Badge label="COMING SOON" tone="warning" />}
                {r.converted && <Badge label={r.completed_jobs ? `CUSTOMER · ${r.completed_jobs} JOBS` : 'HAS ACCOUNT'} tone="accent" />}
              </Row>
            </View>
            <View style={{ flex: wide ? 1.2 : undefined }}>
              <T variant="caption">{r.utm_source ?? '(direct)'}</T>
              <T variant="caption" color="textSecondary">{r.source.replace('_', ' ')}{r.utm_campaign ? ` · ${r.utm_campaign}` : ''}</T>
            </View>
            <T variant="caption" color="textSecondary" style={{ flex: wide ? 0.8 : undefined }}>{day(r.created_at)}</T>
          </View>
        ))}
      </Card>
    </View>
  );
}

/* ---------------- driver onboarding (agreement + COI) ---------------- */

function Onboarding({ d, onChange }: { d: DriverForReview; onChange: () => void }) {
  const theme = useTheme();
  const o = d.onboarding;
  const [expires, setExpires] = useState(o.coi.expires ?? '');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signed = useApi<{ text: string | null; hash: string | null; ip: string | null }>(show ? `/admin/drivers/${d.id}/agreement` : null);

  const saveCoi = async (body: object) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/drivers/${d.id}/coi`, { body });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.background }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="label">Onboarding</T>
        <Badge label={o.ready ? 'READY TO DRIVE' : 'PAPERWORK PENDING'} tone={o.ready ? 'success' : 'warning'} />
      </Row>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {o.steps.map((s) => (
          <Badge key={s.key} label={`${s.done ? '✓' : '○'} ${s.label}`.toUpperCase()} tone={s.done ? 'success' : s.optional ? 'neutral' : 'warning'} />
        ))}
      </Row>
      <T variant="caption" color="textSecondary">
        Agreement:{' '}
        {o.agreement.signedAt
          ? `signed ${day(o.agreement.signedAt)} (v${o.agreement.signedVersion})${o.agreement.current ? '' : ' — outdated, asked to re-sign'}`
          : 'sent at approval, not signed yet'}
        {o.agreement.signedAt && (
          <T variant="caption" color="accent" onPress={() => setShow((v) => !v)}>
            {'  '}
            {show ? 'Hide' : 'View signed copy'}
          </T>
        )}
      </T>
      {show && signed.data?.text && (
        <View style={{ maxHeight: 260, borderWidth: 1, borderColor: theme.border, borderRadius: Radius.md, padding: Spacing.two }}>
          <ScrollView>
            <T variant="caption" selectable style={{ fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined }}>{signed.data.text}</T>
            <T variant="caption" color="textSecondary">SHA-256: {signed.data.hash}</T>
          </ScrollView>
        </View>
      )}
      <T variant="caption" color="textSecondary">
        Certificate of insurance: {o.coi.receivedAt ? `received ${day(o.coi.receivedAt)}, expires ${o.coi.expires ?? '?'}${o.coi.ok ? '' : ' — EXPIRED'}` : 'not received yet'}
      </T>
      <Row gap={Spacing.two} style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ flexGrow: 1, flexBasis: 180 }}>
          <Input label="Policy expires (YYYY-MM-DD)" value={expires} onChangeText={setExpires} placeholder="2027-06-30" autoCapitalize="none" />
        </View>
        <Button title={o.coi.receivedAt ? 'Update COI' : 'Mark COI received'} icon="shield-checkmark" size="sm" onPress={() => saveCoi({ expires: expires.trim() })} loading={busy} />
        {o.coi.receivedAt && <Button title="Clear" kind="secondary" size="sm" onPress={() => saveCoi({ clear: true })} />}
      </Row>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
