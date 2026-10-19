import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';

import { Button, Icon, Row, T } from './ui';

export type Place = { address: string; lat: number; lng: number };
type Suggestion = { line1: string; line2: string; text: string; lat: number; lng: number; needsNumber: boolean };
type Resolved = Place & { verified: boolean };

// Type-ahead address box: suggestions appear as you type, picking one confirms the exact house.
export function AddressSearch({
  onPick,
  placeholder = 'Enter your address',
  autoFocus,
  large,
  near,
}: {
  onPick: (place: Place) => void;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
  near?: { lat: number; lng: number } | null;
}) {
  const theme = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ q: string; list: Suggestion[] }>({ q: '', list: [] });
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  // The confirmed address now in the box; no suggestions while it's unchanged.
  const [picked, setPicked] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<Resolved | null>(null);
  const [highlight, setHighlight] = useState(0);

  const q = query.trim();
  const eligible = q.length >= 3 && !unverified && query !== picked;
  useEffect(() => {
    if (!eligible) return;
    const t = setTimeout(() => {
      const bias = near ? `&lat=${near.lat}&lng=${near.lng}` : '';
      api<Suggestion[]>(`/places/suggest?q=${encodeURIComponent(q)}${bias}`)
        .then((list) => {
          setResults({ q, list });
          setHighlight(0);
          setError(null);
        })
        .catch((e) => {
          setResults({ q, list: [] });
          setError(e.message);
        });
    }, 200);
    return () => clearTimeout(t);
  }, [q, eligible, near]);

  const searching = eligible && results.q !== q;
  const list = eligible ? results.list : [];
  const hasNumber = /^\d/.test(q);

  const pick = async (s: Suggestion) => {
    // A street with no house number yet: fill it in and let them type the number in front.
    if (s.needsNumber) {
      setQuery(`${s.line1}, ${s.line2}`);
      setHint(`Add your house number at the start, e.g. “1234 ${s.line1}”`);
      input.current?.focus();
      return;
    }
    setChecking(s.text);
    setError(null);
    try {
      const r = await api<Resolved>('/places/resolve', { body: { text: s.text, lat: s.lat, lng: s.lng } });
      if (r.verified) {
        setQuery(r.address);
        setPicked(r.address);
        onPick(r);
      } else setUnverified(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setChecking(null);
    }
  };

  const onKeyPress = (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    if (Platform.OS !== 'web' || !list.length) return;
    const k = e.nativeEvent.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault?.();
      setHighlight((h) => (h + (k === 'ArrowDown' ? 1 : list.length - 1)) % list.length);
    }
  };

  const height = large ? 60 : 50;
  return (
    <View style={{ gap: Spacing.two }}>
      <Row
        gap={Spacing.two}
        style={{
          height,
          paddingHorizontal: Spacing.three,
          borderRadius: large ? Radius.pill : Radius.md,
          borderWidth: large ? 2 : 1,
          borderColor: large ? theme.text : theme.border,
          backgroundColor: theme.card,
        }}>
        <Icon name="location" color="primary" size={large ? 24 : 20} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setUnverified(null);
            setError(null);
            setHint(null);
          }}
          onKeyPress={onKeyPress}
          onSubmitEditing={() => list[highlight] && pick(list[highlight])}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
          returnKeyType="search"
          accessibilityLabel="Address"
          style={[
            { flex: 1, height: '100%', color: theme.text, fontFamily: Fonts.sans, fontSize: large ? 18 : 16, fontWeight: '600' },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
          ]}
        />
        {(searching || checking) && <ActivityIndicator color={theme.primary} />}
        {!!query && !searching && !checking && (
          <Pressable accessibilityLabel="Clear address" hitSlop={10} onPress={() => setQuery('')}>
            <Icon name="close-circle" color="textSecondary" />
          </Pressable>
        )}
      </Row>

      {list.length > 0 && (
        <View style={{ borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, overflow: 'hidden' }}>
          {list.map((s, i) => (
            <Pressable
              key={s.text}
              onPress={() => pick(s)}
              onHoverIn={() => setHighlight(i)}
              accessibilityRole="button"
              accessibilityLabel={s.text}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                paddingVertical: 12,
                paddingHorizontal: Spacing.three,
                backgroundColor: pressed || (Platform.OS === 'web' && i === highlight) ? theme.backgroundElement : 'transparent',
                borderTopWidth: i ? 1 : 0,
                borderColor: theme.border,
              })}>
              <Icon name={s.needsNumber ? 'navigate-outline' : 'home-outline'} color="textSecondary" />
              <View style={{ flex: 1 }}>
                <T variant="label" numberOfLines={1}>{s.line1}</T>
                <T variant="caption" color="textSecondary" numberOfLines={1}>{s.line2}</T>
              </View>
              {checking === s.text && <ActivityIndicator color={theme.primary} />}
            </Pressable>
          ))}
        </View>
      )}

      {eligible && !searching && !list.length && !error && !hint && (
        <T variant="caption" color="textSecondary">
          {hasNumber ? 'No match yet. Keep typing the street name, then the city.' : 'Start with your house number, e.g. 1234 Lyndale Ave S.'}
        </T>
      )}

      {unverified && (
        <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.stormBg, borderWidth: 1, borderColor: theme.stormBorder }}>
          <T variant="label">We couldn’t confirm “{unverified.address}”.</T>
          <T variant="caption" color="textSecondary">Double-check the house number. If it’s right (new homes can be missing), use it anyway and add directions for your driver.</T>
          <Row gap={Spacing.two}>
            <Button title="Use it anyway" size="sm" onPress={() => {
              setQuery(unverified.address);
              setPicked(unverified.address);
              setUnverified(null);
              onPick(unverified);
            }} />
            <Button title="Edit address" size="sm" kind="ghost" onPress={() => {
              setUnverified(null);
              input.current?.focus();
            }} />
          </Row>
        </View>
      )}

      {hint && <T variant="caption" color="textSecondary">{hint}</T>}
      {error && <T variant="caption" color="danger">{error}</T>}
    </View>
  );
}
