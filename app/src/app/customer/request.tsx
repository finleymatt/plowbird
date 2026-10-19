import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { QuoteLines, TipPicker } from '@/components/job-parts';
import { PaymentMethodCard } from '@/components/payment-method';
import { PromoField } from '@/components/promo-field';
import { Badge, Button, Card, Chip, ChipGroup, ErrorText, Icon, Input, Loading, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { money, SIZE_LABEL, when } from '@/lib/format';
import { clearPendingPromo, usePromoCode } from '@/lib/promo';
import type { Conditions, Job, PaymentMethods, Property, Quote } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const DEPTHS = [2, 4, 6, 8, 12, 18];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM – 10 PM

const nearestDepth = (inches: number) => DEPTHS.reduce((best, d) => (Math.abs(d - inches) < Math.abs(best - inches) ? d : best), 4);
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

function slotDate(now: number, dayOffset: number, hour: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export default function RequestPlow() {
  const params = useLocalSearchParams<{ propertyId: string; mode?: 'now' | 'schedule'; promo?: string }>();
  const props = useApi<Property[]>('/properties');
  const property = props.data?.find((p) => String(p.id) === params.propertyId) ?? props.data?.[0];
  const wx = useApi<Conditions>(property ? `/weather?lat=${property.lat}&lng=${property.lng}` : null);
  const payment = useApi<PaymentMethods>('/payments/methods');
  const needsCard = payment.data?.mode === 'stripe' && !payment.data.card && !payment.data.demo;

  // Captured once so slot math is stable across renders.
  const [now] = useState(() => Date.now());
  const [mode, setMode] = useState<'now' | 'schedule'>(params.mode === 'schedule' ? 'schedule' : 'now');
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(6);
  const [depth, setDepth] = useState<number | null>(null);
  const [tip, setTip] = useState(500);
  const [notes, setNotes] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [promo, setPromoCode] = usePromoCode(params.promo);
  const [promoError, setPromoError] = useState<string | null>(null);
  const setPromo = (code: string) => {
    setPromoError(null);
    setPromoCode(code);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default the depth to what's forecast to fall.
  const forecastIn = wx.data?.snowfall.next24h.inches ?? 0;
  const effectiveDepth = depth ?? (forecastIn > 0 ? nearestDepth(forecastIn) : 4);
  const effectiveNotes = notes ?? property?.notes ?? '';

  useEffect(() => {
    if (!property) return;
    let stale = false; // ignore out-of-order responses when depth changes quickly
    api<Quote>(`/quote?propertyId=${property.id}&depth=${effectiveDepth}${promo ? `&promo=${encodeURIComponent(promo)}` : ''}`)
      .then((q) => !stale && setQuote(q))
      .catch((e) => !stale && setError(e.message));
    return () => {
      stale = true;
    };
  }, [property?.id, effectiveDepth, promo]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = slotDate(now, i, 12);
        return { i, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short' }), sub: d.toLocaleDateString([], { month: 'short', day: 'numeric' }) };
      }),
    [now],
  );
  const hours = HOURS.filter((h) => slotDate(now, day, h).getTime() > now + 60 * 60_000);
  const afterStorm = wx.data?.snowfall.next48h.endsAt ? new Date(Date.parse(wx.data.snowfall.next48h.endsAt) + 3600_000) : null;

  if (!property) return <Loading />;

  const scheduledFor = mode === 'schedule' ? slotDate(now, day, hours.includes(hour) ? hour : hours[0] ?? hour) : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const job = await api<Job>('/jobs', {
        body: {
          propertyId: property.id,
          depthIn: effectiveDepth,
          tipCents: tip,
          notes: effectiveNotes || undefined,
          scheduledFor: scheduledFor?.toISOString(),
          promoCode: quote?.promo?.code,
        },
      });
      if (job.promoCode) clearPendingPromo();
      router.dismissTo({ pathname: '/customer/job/[id]', params: { id: String(job.id) } });
    } catch (e: any) {
      if (e instanceof ApiError && e.code === 'promo_invalid') setPromoError(e.message);
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} contentStyle={{ gap: Spacing.two }}>
      <Card style={{ gap: 4 }}>
        <Row>
          <Icon name="home" color="accent" />
          <T variant="heading">{property.label}</T>
        </Row>
        <T color="textSecondary">{property.address}</T>
        <T variant="caption" color="textSecondary">
          {SIZE_LABEL[property.size]} · {property.length} length{property.sidewalk ? ' · sidewalk included' : ''}
        </T>
      </Card>

      <SectionTitle>When</SectionTitle>
      <ChipGroup>
        <Chip label="As soon as possible" icon="flash" selected={mode === 'now'} onPress={() => setMode('now')} />
        <Chip label="Schedule" icon="calendar" selected={mode === 'schedule'} onPress={() => setMode('schedule')} />
      </ChipGroup>
      {mode === 'schedule' && (
        <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
          {afterStorm && afterStorm.getTime() > now && (
            <Card
              onPress={() => {
                const offset = Math.round((new Date(afterStorm).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400_000);
                setDay(Math.min(6, Math.max(0, offset)));
                setHour(Math.min(22, Math.max(5, afterStorm.getHours() + (afterStorm.getMinutes() ? 1 : 0))));
              }}
              style={{ gap: 2 }}>
              <Row>
                <Icon name="sparkles" color="primary" size={18} />
                <T variant="label" color="primary">Suggested: right after the storm</T>
              </Row>
              <T variant="caption" color="textSecondary">Snow is forecast to end {when(wx.data!.snowfall.next48h.endsAt)}. Tap to schedule for ~1 hour later.</T>
            </Card>
          )}
          <ChipGroup>
            {days.map((d) => (
              <Chip key={d.i} label={d.label} sublabel={d.sub} selected={day === d.i} onPress={() => setDay(d.i)} />
            ))}
          </ChipGroup>
          {hours.length ? (
            <ChipGroup>
              {hours.map((h) => (
                <Chip key={h} label={hourLabel(h)} selected={scheduledFor?.getHours() === h} onPress={() => setHour(h)} />
              ))}
            </ChipGroup>
          ) : (
            <T color="textSecondary">No more slots today — pick another day.</T>
          )}
          <T variant="caption" color="textSecondary">
            Drivers can claim your job ahead of time. It opens to all nearby drivers 45 minutes before your time.
          </T>
        </View>
      )}

      <SectionTitle>How much snow?</SectionTitle>
      {forecastIn > 0 && <Badge label={`${forecastIn}" forecast next 24 hrs`} tone="primary" icon="snow" />}
      <ChipGroup>
        {DEPTHS.map((d) => (
          <Chip key={d} label={d === 18 ? '18"+' : `${d}"`} selected={effectiveDepth === d} onPress={() => setDepth(d)} />
        ))}
      </ChipGroup>

      <SectionTitle>Tip your driver</SectionTitle>
      <TipPicker value={tip} onChange={setTip} base={quote?.totalBeforeDiscount ?? quote?.total ?? 4500} />
      <T variant="caption" color="textSecondary">100% goes to your driver. You can change it after the job.</T>

      <SectionTitle>Notes for driver</SectionTitle>
      <Input value={effectiveNotes} onChangeText={setNotes} placeholder="Gate codes, where to pile snow, cars in the driveway…" multiline style={{ minHeight: 72, textAlignVertical: 'top' }} />

      <SectionTitle>Price</SectionTitle>
      <Card style={{ gap: Spacing.three }}>
        {quote ? <QuoteLines quote={quote} tipCents={tip} /> : <T color="textSecondary">Calculating…</T>}
        <PromoField code={promo} quote={quote} error={promoError} onChange={setPromo} />
      </Card>

      <SectionTitle>Payment</SectionTitle>
      <PaymentMethodCard methods={payment.data} onChange={payment.setData} />
      <ErrorText>{payment.error}</ErrorText>

      <ErrorText>{error}</ErrorText>
      <Button
        style={{ marginTop: Spacing.three }}
        title={
          quote
            ? `${mode === 'now' ? 'Request plow' : `Schedule for ${when(scheduledFor?.toISOString())}`} · ${money(quote.total + tip)}`
            : 'Request plow'
        }
        onPress={submit}
        loading={busy}
        disabled={!quote || !payment.data || needsCard || (mode === 'schedule' && !hours.length)}
      />
    </Screen>
  );
}
