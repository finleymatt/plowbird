import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { when } from '@/lib/format';
import type { Conditions } from '@/lib/types';

import { Badge, Card, Icon, Row, T, type IconName } from './ui';

function iconFor(text: string, isDay = true): IconName {
  const t = text.toLowerCase();
  if (/blizzard|snow|flurr/.test(t)) return 'snow';
  if (/sleet|freezing|ice/.test(t)) return 'rainy';
  if (/rain|shower|drizzle/.test(t)) return 'rainy';
  if (/thunder/.test(t)) return 'thunderstorm';
  if (/fog|haze|smoke/.test(t)) return 'cloud';
  if (/cloud|overcast/.test(t)) return /partly|mostly sunny/.test(t) ? (isDay ? 'partly-sunny' : 'cloudy-night') : 'cloudy';
  return isDay ? 'sunny' : 'moon';
}

const LEVEL = {
  none: { label: 'No snow expected', tone: 'neutral' },
  light: { label: 'Light snow', tone: 'accent' },
  moderate: { label: 'Plowable snow', tone: 'warning' },
  significant: { label: 'Winter storm', tone: 'primary' },
  major: { label: 'Major storm', tone: 'danger' },
} as const;

export function StormBanner({ wx }: { wx: Conditions }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (!wx.alerts.length) return null;
  const a = wx.alerts[0];
  return (
    <Pressable
      onPress={() => setOpen(!open)}
      style={{
        backgroundColor: theme.stormBg,
        borderColor: theme.stormBorder,
        borderWidth: 1,
        borderRadius: Radius.lg,
        padding: Spacing.three,
        gap: Spacing.one,
      }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Icon name="warning" color="primary" />
          <T variant="heading" color="primary">
            {a.event}
          </T>
        </Row>
        {wx.simulated && <Badge label="Simulated" tone="warning" />}
      </Row>
      <T variant="label">{a.headline}</T>
      {a.ends && <T variant="caption" color="textSecondary">Until {when(a.ends)} · National Weather Service</T>}
      {open && (
        <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
          <T variant="caption">{a.description}</T>
          {a.instruction && <T variant="caption" color="textSecondary">{a.instruction}</T>}
        </View>
      )}
      {wx.alerts.length > 1 && <T variant="caption" color="textSecondary">+{wx.alerts.length - 1} more alert(s)</T>}
    </Pressable>
  );
}

export function ConditionsCard({ wx }: { wx: Conditions }) {
  const theme = useTheme();
  const level = LEVEL[wx.stormLevel];
  const snow24 = wx.snowfall.next24h;
  const snow48 = wx.snowfall.next48h;
  return (
    <Card style={{ gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 2, flex: 1 }}>
          <T variant="caption" color="textSecondary">
            Now in {wx.location}
          </T>
          <Row gap={Spacing.three}>
            <T variant="number">{wx.current.tempF ?? '--'}°</T>
            <Icon name={iconFor(wx.current.description ?? '')} size={36} color="accent" />
          </Row>
          <T variant="label">{wx.current.description}</T>
          <T variant="caption" color="textSecondary">
            {[
              wx.current.windChillF != null && wx.current.windChillF !== wx.current.tempF ? `Feels like ${wx.current.windChillF}°` : null,
              wx.current.windMph != null ? `Wind ${wx.current.windMph} mph${wx.current.gustMph ? `, gusts ${wx.current.gustMph}` : ''}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </T>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label={level.label} tone={level.tone} icon="snow" />
        </View>
      </Row>

      <Row gap={Spacing.two}>
        <SnowStat label="Next 24 hrs" inches={snow24.inches} sub={snow24.startsAt ? `Starts ${when(snow24.startsAt)}` : 'No snow forecast'} />
        <SnowStat label="Next 48 hrs" inches={snow48.inches} sub={snow48.endsAt ? `Ends ${when(snow48.endsAt)}` : ' '} />
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {wx.forecast.map((f) => (
          <View
            key={f.startTime}
            style={{
              width: 92,
              padding: Spacing.two,
              borderRadius: Radius.md,
              backgroundColor: theme.backgroundElement,
              alignItems: 'center',
              gap: 4,
            }}>
            <T variant="caption" color="textSecondary" numberOfLines={1}>
              {f.name.replace('This ', '')}
            </T>
            <Icon name={iconFor(f.short, f.isDaytime)} size={22} color="accent" />
            <T variant="heading">{f.tempF}°</T>
            <T variant="caption" color="textSecondary" numberOfLines={2} style={{ textAlign: 'center', fontSize: 11, lineHeight: 14 }}>
              {f.short}
            </T>
            {f.precipChance > 0 && (
              <T variant="caption" color="accent" style={{ fontSize: 11 }}>
                {f.precipChance}%
              </T>
            )}
          </View>
        ))}
      </ScrollView>
      <T variant="caption" color="textSecondary" style={{ fontSize: 11 }}>
        {wx.simulated ? 'Simulated storm overlay on live NWS data' : `National Weather Service${wx.current.station ? ` · ${wx.current.station}` : ''}`}
      </T>
    </Card>
  );
}

function SnowStat({ label, inches, sub }: { label: string; inches: number; sub: string }) {
  const theme = useTheme();
  const hot = inches >= 2;
  return (
    <View
      style={{
        flex: 1,
        padding: Spacing.three,
        borderRadius: Radius.md,
        backgroundColor: hot ? theme.stormBg : theme.backgroundElement,
        gap: 2,
      }}>
      <T variant="caption" color="textSecondary">
        {label}
      </T>
      <T variant="title" color={hot ? 'primary' : 'text'}>
        {`${inches}"`}
      </T>
      <T variant="caption" color="textSecondary" numberOfLines={1}>
        {sub}
      </T>
    </View>
  );
}
