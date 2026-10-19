import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';

import { Button, Card, Chip, ChipGroup, ErrorText, Icon, Input, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { LENGTH_LABEL, SIZE_LABEL } from '@/lib/format';
import type { DrivewayLength, DrivewaySize } from '@/lib/types';

type Match = { address: string; lat: number; lng: number };
const LABELS = ['Home', 'Cabin', 'Rental', 'Work', "Parents'"];

export default function AddProperty() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ q: string; matches: Match[] }>({ q: '', matches: [] });
  const [picked, setPicked] = useState<Match | null>(null);
  const [label, setLabel] = useState('Home');
  const [size, setSize] = useState<DrivewaySize>('double');
  const [length, setLength] = useState<DrivewayLength>('standard');
  const [sidewalk, setSidewalk] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced US Census address lookup. Results are tagged with the query that
  // produced them, so "searching" is just "the latest results are for an older query".
  const eligible = !picked && query.trim().length >= 8;
  useEffect(() => {
    if (!eligible) return;
    const t = setTimeout(() => {
      api<Match[]>(`/geocode?q=${encodeURIComponent(query)}`)
        .then((matches) => setResult({ q: query, matches }))
        .catch(() => setResult({ q: query, matches: [] }));
    }, 500);
    return () => clearTimeout(t);
  }, [query, eligible]);
  const searching = eligible && result.q !== query;
  const matches = eligible && !searching ? result.matches : [];

  const save = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await api('/properties', { body: { ...picked, label, size, length, sidewalk, notes: notes || undefined } });
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
        <View style={{ gap: Spacing.two }}>
          <Input value={query} onChangeText={setQuery} placeholder="Street address, city, state" autoComplete="street-address" autoFocus />
          {searching && <T variant="caption" color="textSecondary">Searching…</T>}
          {matches.map((m) => (
            <Card key={m.address} onPress={() => setPicked(m)} style={{ paddingVertical: Spacing.two }}>
              <Row>
                <Icon name="location-outline" color="accent" size={18} />
                <T variant="label" style={{ flex: 1 }}>{m.address}</T>
              </Row>
            </Card>
          ))}
          {!searching && query.length >= 8 && !matches.length && (
            <T variant="caption" color="textSecondary">No match yet. Include the house number, street, city, and state (e.g. 1200 Main St, Sioux Falls, SD).</T>
          )}
        </View>
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
