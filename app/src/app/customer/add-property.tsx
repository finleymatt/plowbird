import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { AddressSearch, type Place } from '@/components/address-search';
import { Button, Card, Chip, ChipGroup, ErrorText, Icon, Input, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { confirmPlace } from '@/lib/places';
import { LENGTH_LABEL, SIZE_LABEL } from '@/lib/format';
import type { DrivewayLength, DrivewaySize } from '@/lib/types';

const LABELS = ['Home', 'Cabin', 'Rental', 'Work', "Parents'"];

export default function AddProperty() {
  const theme = useTheme();
  const [picked, setPicked] = useState<Place | null>(null);
  const [label, setLabel] = useState('Home');
  const [size, setSize] = useState<DrivewaySize>('double');
  const [length, setLength] = useState<DrivewayLength>('standard');
  const [sidewalk, setSidewalk] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      // Pin the exact house (falls back to the street location if the Census doesn't know it).
      const place = await confirmPlace(picked).catch(() => picked);
      await api('/properties', { body: { address: place.address, lat: place.lat, lng: place.lng, label, size, length, sidewalk, notes: notes || undefined } });
      if (router.canGoBack()) router.back();
      else router.replace('/customer');
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} contentStyle={{ gap: Spacing.two }}>
      <SectionTitle>Address</SectionTitle>
      {picked ? (
        <Card style={{ gap: Spacing.two }}>
          <Row>
            <Icon name="location" color="primary" />
            <T variant="label" style={{ flex: 1 }}>{picked.address}</T>
          </Row>
          <Button title="Change" kind="ghost" size="sm" onPress={() => setPicked(null)} />
        </Card>
      ) : (
        <AddressSearch onPick={setPicked} autoFocus />
      )}

      <SectionTitle>Name</SectionTitle>
      <ChipGroup>
        {LABELS.map((l) => (
          <Chip key={l} label={l} selected={label === l} onPress={() => setLabel(l)} />
        ))}
      </ChipGroup>

      <SectionTitle>Driveway size</SectionTitle>
      <ChipGroup>
        {(Object.keys(SIZE_LABEL) as DrivewaySize[]).map((s) => (
          <Chip key={s} label={SIZE_LABEL[s]} selected={size === s} onPress={() => setSize(s)} />
        ))}
      </ChipGroup>

      <SectionTitle>Driveway length</SectionTitle>
      <ChipGroup>
        {(Object.keys(LENGTH_LABEL) as DrivewayLength[]).map((l) => (
          <Chip
            key={l}
            label={LENGTH_LABEL[l]}
            sublabel={{ short: 'Under 30 ft', standard: '30–60 ft', long: 'Over 60 ft' }[l]}
            selected={length === l}
            onPress={() => setLength(l)}
          />
        ))}
      </ChipGroup>

      <Card style={{ marginTop: Spacing.three }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T variant="heading">Sidewalk & front walk</T>
            <T variant="caption" color="textSecondary">Many MN cities require clearing within 24 hrs of a snowfall. +$10</T>
          </View>
          <Switch value={sidewalk} onValueChange={setSidewalk} trackColor={{ true: theme.primary, false: theme.backgroundSelected }} thumbColor="#fff" />
        </Row>
      </Card>

      <SectionTitle>Notes for drivers</SectionTitle>
      <Input value={notes} onChangeText={setNotes} placeholder="Where to pile snow, gate code, things to avoid…" multiline style={{ minHeight: 72, textAlignVertical: 'top' }} />

      <ErrorText>{error}</ErrorText>
      <Button title="Save driveway" onPress={save} loading={busy} disabled={!picked} style={{ marginTop: Spacing.three }} />
    </Screen>
  );
}
