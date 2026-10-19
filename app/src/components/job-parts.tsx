import { Pressable, View } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { money, moneyExact, STATUS_LABEL, when } from '@/lib/format';
import type { Job, JobStatus, Quote } from '@/lib/types';

import { Badge, Card, Chip, ChipGroup, Icon, Row, T, type IconName } from './ui';

const STEPS: { key: JobStatus; label: string; icon: IconName }[] = [
  { key: 'requested', label: 'Requested', icon: 'receipt-outline' },
  { key: 'accepted', label: 'Driver assigned', icon: 'person-outline' },
  { key: 'en_route', label: 'On the way', icon: 'car-outline' },
  { key: 'in_progress', label: 'Plowing', icon: 'snow-outline' },
  { key: 'completed', label: 'Clear!', icon: 'checkmark-circle-outline' },
];
const ORDER: Record<JobStatus, number> = { scheduled: 0, requested: 0, accepted: 1, en_route: 2, in_progress: 3, completed: 4, cancelled: -1 };

export function StatusTimeline({ status }: { status: JobStatus }) {
  const theme = useTheme();
  const at = ORDER[status];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {STEPS.map((s, i) => {
        const done = i <= at;
        const current = i === at;
        return (
          <View key={s.key} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? 'transparent' : done ? theme.primary : theme.border }} />
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? theme.primary : theme.backgroundElement,
                  borderWidth: current ? 3 : 0,
                  borderColor: theme.stormBorder,
                }}>
                <Icon name={s.icon} size={16} color={done ? 'primaryText' : 'textSecondary'} />
              </View>
              <View style={{ flex: 1, height: 3, backgroundColor: i === STEPS.length - 1 ? 'transparent' : i < at ? theme.primary : theme.border }} />
            </View>
            <T variant="caption" color={done ? 'text' : 'textSecondary'} style={{ fontSize: 11, textAlign: 'center' }}>
              {s.label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

export function QuoteLines({ quote, tipCents = 0, driverView = false }: { quote: Quote; tipCents?: number; driverView?: boolean }) {
  if (driverView) {
    return (
      <View style={{ gap: 6 }}>
        <Line label="Plow payout" value={moneyExact(quote.driverPayout)} />
        <Line label="Tip (100% yours)" value={moneyExact(tipCents)} />
        <Line label="You earn" value={moneyExact(quote.driverPayout + tipCents)} bold />
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      {quote.lines.map((l) =>
        l.cents < 0 ? (
          <Line key={l.label} label={l.label} value={`−${moneyExact(-l.cents)}`} color="success" />
        ) : (
          <Line key={l.label} label={l.label} value={moneyExact(l.cents)} />
        ),
      )}
      {tipCents > 0 && <Line label="Driver tip" value={moneyExact(tipCents)} />}
      <Line label="Total" value={moneyExact(quote.total + tipCents)} bold />
    </View>
  );
}

function Line({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: ThemeColor }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T variant={bold ? 'heading' : 'body'} color={color ?? (bold ? 'text' : 'textSecondary')}>
        {label}
      </T>
      <T variant={bold ? 'heading' : 'body'} color={color}>{value}</T>
    </Row>
  );
}

export function KindBadge({ job }: { job: Job }) {
  if (job.covered) return <Badge label="Storm Pass" tone="accent" icon="snow" />;
  if (job.kind === 'storm_auto') return <Badge label="Storm auto-plow" tone="primary" icon="flash" />;
  if (job.kind === 'scheduled') return <Badge label={when(job.scheduledFor)} tone="accent" icon="calendar" />;
  return <Badge label="ASAP" tone="warning" icon="flash" />;
}

export function StatusBadge({ status }: { status: JobStatus }) {
  const tone = status === 'completed' ? 'success' : status === 'cancelled' ? 'neutral' : status === 'requested' ? 'warning' : 'primary';
  return <Badge label={STATUS_LABEL[status]} tone={tone} />;
}

export function JobRow({ job, onPress, driverView }: { job: Job; onPress: () => void; driverView?: boolean }) {
  return (
    <Card onPress={onPress} style={{ gap: Spacing.two }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <StatusBadge status={job.status} />
        <T variant="heading">{driverView ? money(job.quote.driverPayout + job.tipCents) : job.covered ? 'Storm Pass' : money(job.priceCents + job.tipCents)}</T>
      </Row>
      <T variant="label" numberOfLines={1}>
        {job.property.label} · {job.property.address}
      </T>
      <Row style={{ justifyContent: 'space-between' }}>
        <KindBadge job={job} />
        <T variant="caption" color="textSecondary">
          {/* Scheduled jobs already show their time in the badge. */}
          {job.completedAt
            ? `Done ${when(job.completedAt)}`
            : job.kind === 'storm_auto'
              ? `For ${when(job.scheduledFor)}`
              : job.kind === 'asap'
                ? `Requested ${when(job.createdAt)}`
                : ''}
        </T>
      </Row>
    </Card>
  );
}

export const TIP_PRESETS = [0, 500, 1000, 1500, 2000];

export function TipPicker({ value, onChange, base }: { value: number; onChange: (c: number) => void; base: number }) {
  return (
    <ChipGroup>
      {TIP_PRESETS.map((c) => (
        <Chip
          key={c}
          label={c ? money(c) : 'None'}
          sublabel={c ? `${Math.round((c / base) * 100)}%` : undefined}
          selected={value === c}
          onPress={() => onChange(c)}
        />
      ))}
    </ChipGroup>
  );
}

export function Stars({ value, onChange, size = 36 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <Row gap={Spacing.one}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} disabled={!onChange} hitSlop={6} accessibilityLabel={`${n} stars`}>
          <Icon name={n <= value ? 'star' : 'star-outline'} size={size} color="primary" />
        </Pressable>
      ))}
    </Row>
  );
}

export function DriverCard({ job, onCall }: { job: Job; onCall?: () => void }) {
  const theme = useTheme();
  const d = job.driver!;
  return (
    <Row gap={Spacing.three}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: Radius.pill,
          backgroundColor: theme.backgroundSelected,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <T variant="heading">{d.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</T>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="heading">{d.name}</T>
        <T variant="caption" color="textSecondary" numberOfLines={1}>
          {d.rating ? `★ ${d.rating} (${d.ratingCount})` : 'New driver'} · {d.vehicle ?? 'Plow truck'}
        </T>
      </View>
      {onCall && d.phone && (
        <Pressable
          onPress={onCall}
          accessibilityLabel="Call driver"
          style={{ padding: 12, borderRadius: Radius.pill, backgroundColor: theme.backgroundElement }}>
          <Icon name="call" color="accent" />
        </Pressable>
      )}
    </Row>
  );
}
