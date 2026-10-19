import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { AddressSearch } from '@/components/address-search';
import { JobRow } from '@/components/job-parts';
import { Brand } from '@/components/landing';
import { Button, Card, Chip, ChipGroup, ErrorText, Loading, Row, Screen, SectionTitle, T } from '@/components/ui';
import { ConditionsCard, StormBanner } from '@/components/weather';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth, useSocketEvent } from '@/lib/auth';
import { isOpen, SIZE_LABEL } from '@/lib/format';
import type { Conditions, Job, Property, StormPlan } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const THRESHOLDS = [1, 2, 3, 4, 6];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function CustomerHome() {
  const { user } = useAuth();
  const theme = useTheme();
  const props = useApi<Property[]>('/properties');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const property = props.data?.find((p) => p.id === selectedId) ?? props.data?.[0] ?? null;

  const wx = useApi<Conditions>(property ? `/weather?lat=${property.lat}&lng=${property.lng}` : null);
  const jobs = useApi<Job[]>('/jobs');
  const plans = useApi<StormPlan[]>('/storm-plans');

  useSocketEvent('job', () => {
    jobs.reload();
    plans.reload();
  });
  useSocketEvent('weather:changed', () => wx.reload());

  if (props.loading && !props.data) return <Loading />;

  const active = (jobs.data ?? []).filter((j) => isOpen(j.status));
  const plan = plans.data?.find((p) => p.property_id === property?.id);

  const savePlan = async (next: { active: boolean; thresholdIn: number }) => {
    if (!property) return;
    await api(`/storm-plans/${property.id}`, { method: 'PUT', body: next });
    plans.reload();
  };

  const refresh = () => {
    props.reload();
    wx.reload();
    jobs.reload();
    plans.reload();
  };

  return (
    <Screen onRefresh={refresh} refreshing={false} contentStyle={{ gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T variant="caption" color="textSecondary">
            {greeting()}
          </T>
          <T variant="title">{user?.name.split(' ')[0]}</T>
        </View>
        <Brand size={18} />
      </Row>

      {!property ? (
        <View style={{ gap: Spacing.three }}>
          <T variant="heading">Where should we plow?</T>
          <AddressSearch
            large
            onPick={(p) => router.push({ pathname: '/order', params: { address: p.address, lat: String(p.lat), lng: String(p.lng) } })}
          />
          <T variant="caption" color="textSecondary">You’ll see your price right away. We save the address for next time.</T>
        </View>
      ) : (
        <>
          <ChipGroup>
            {props.data!.map((p) => (
              <Chip key={p.id} label={p.label} icon="home" selected={p.id === property.id} onPress={() => setSelectedId(p.id)} />
            ))}
            <Chip label="Add" icon="add" onPress={() => router.push('/customer/add-property')} />
          </ChipGroup>
          <T variant="caption" color="textSecondary" numberOfLines={1}>
            {property.address} · {SIZE_LABEL[property.size]}
            {property.sidewalk ? ' + sidewalk' : ''}
          </T>

          {wx.data && <StormBanner wx={wx.data} />}

          {active.length > 0 && (
            <View style={{ gap: Spacing.two }}>
              {active.map((j) => (
                <JobRow key={j.id} job={j} onPress={() => router.push({ pathname: '/customer/job/[id]', params: { id: String(j.id) } })} />
              ))}
            </View>
          )}

          <Row gap={Spacing.two}>
            <Button
              title="Plow now"
              icon="flash"
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/customer/request', params: { propertyId: String(property.id), mode: 'now' } })}
            />
            <Button
              title="Schedule"
              icon="calendar"
              kind="secondary"
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/customer/request', params: { propertyId: String(property.id), mode: 'schedule' } })}
            />
          </Row>

          <SectionTitle>Current conditions</SectionTitle>
          {wx.data ? <ConditionsCard wx={wx.data} /> : wx.error ? <ErrorText>{wx.error}</ErrorText> : <Card><T color="textSecondary">Loading conditions…</T></Card>}

          <SectionTitle>Storm auto-plow</SectionTitle>
          <Card style={{ gap: Spacing.three }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: Spacing.three }}>
                <T variant="heading">Book automatically</T>
                <T variant="caption" color="textSecondary">
                  When the NWS forecast for {property.label.toLowerCase()} hits your threshold, we schedule a plow for about an hour after the snow stops.
                </T>
              </View>
              <Switch
                value={!!plan?.active}
                onValueChange={(v) => savePlan({ active: v, thresholdIn: plan?.threshold_in ?? 2 })}
                trackColor={{ true: theme.primary, false: theme.backgroundSelected }}
                thumbColor="#fff"
              />
            </Row>
            {plan?.active && (
              <>
                <T variant="label" color="textSecondary">
                  Plow when the forecast reaches
                </T>
                <ChipGroup>
                  {THRESHOLDS.map((t) => (
                    <Chip key={t} label={`${t}"+`} selected={plan.threshold_in === t} onPress={() => savePlan({ active: true, thresholdIn: t })} />
                  ))}
                </ChipGroup>
                <T variant="caption" color="textSecondary">
                  You’ll get a notification with the price and can cancel free any time before your driver heads out.
                </T>
              </>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
