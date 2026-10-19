import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';

import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import type { Place } from '@/lib/places';

import { elevation, Icon, Row, T } from './ui';

export type { Place };
type Suggestion = { line1: string; line2: string; text: string; lat: number; lng: number; needsNumber: boolean; exact?: boolean };

// Suggestions already fetched this session, so backspacing and retyping are instant.
const cache = new Map<string, Suggestion[]>();

// Type-ahead address box. Picking a suggestion returns right away; callers confirm the exact
// house in the background with confirmPlace() (see lib/places.ts).
export function AddressSearch({
  onPick,
  placeholder = 'Enter your address',
  autoFocus,
  large,
  cta,
  near,
}: {
  onPick: (place: Place) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Big search bar for hero sections. */
  large?: boolean;
  /** Button inside the bar, e.g. "Get a plow"; picks the highlighted suggestion. */
  cta?: string;
  near?: { lat: number; lng: number } | null;
}) {
  const theme = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ q: string; list: Suggestion[] }>({ q: '', list: [] });
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [focused, setFocused] = useState(false);

  const q = query.trim();
  const key = `${q.toLowerCase()}|${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ''}`;
  const eligible = q.length >= 3 && query !== picked;
  const hit = eligible ? cache.get(key) : undefined;
  // Ask on every keystroke (no waiting for a pause) and let answers land as they come back:
  // the list always shows the freshest results we have, so it fills in while you type.
  useEffect(() => {
    if (!eligible || cache.has(key)) return;
    let stale = false;
    const bias = near ? `&lat=${near.lat}&lng=${near.lng}` : '';
    api<Suggestion[]>(`/places/suggest?q=${encodeURIComponent(q)}${bias}`)
      .then((list) => {
        cache.set(key, list);
        // An older, shorter query answering late shouldn't replace newer results.
        setResults((prev) => (prev.q.length > q.length && prev.q.startsWith(q) ? prev : { q, list }));
        if (!stale) setHighlight(0);
        setError(null);
      })
      .catch((e) => {
        if (!stale) setError(e.message);
      });
    return () => {
      stale = true;
    };
  }, [key, eligible]); // eslint-disable-line react-hooks/exhaustive-deps

  const searching = eligible && !hit && results.q !== q;
  // Exact cached answer if we have one, otherwise the latest list so far (no flicker, no blank).
  const list = eligible ? (hit ?? results.list) : [];
  const active = Math.min(highlight, Math.max(0, list.length - 1));
  const hasNumber = /^\d/.test(q);

  const pick = (s: Suggestion) => {
    // A street with no house number yet: fill it in and let them type the number in front.
    if (s.needsNumber) {
      setQuery(`${s.line1}, ${s.line2}`);
      setHint(`Add your house number at the start, e.g. “1234 ${s.line1}”`);
      input.current?.focus();
      return;
    }
    setQuery(s.text);
    setPicked(s.text);
    setHint(null);
    onPick({ address: s.text, lat: s.lat, lng: s.lng, confirmed: !!s.exact });
  };

  const onKeyPress = (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    if (Platform.OS !== 'web' || !list.length) return;
    const k = e.nativeEvent.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault?.();
      setHighlight((h) => (h + (k === 'ArrowDown' ? 1 : list.length - 1)) % list.length);
    }
  };

  const height = large ? 64 : 52;
  return (
    <View style={{ gap: Spacing.two }}>
      <Row
        gap={Spacing.two}
        style={[
          { height, paddingLeft: Spacing.three, paddingRight: cta ? 6 : Spacing.three, borderRadius: large ? Radius.pill : Radius.md, borderWidth: 2 },
          large
            ? [{ backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.card }, elevation(2)]
            : { backgroundColor: theme.backgroundElement, borderColor: focused ? theme.accent : 'transparent' },
        ]}>
        <Icon name="location-sharp" color="primary" size={large ? 24 : 20} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setError(null);
            setHint(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyPress={onKeyPress}
          onSubmitEditing={() => list[active] && pick(list[active])}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
          returnKeyType="search"
          accessibilityLabel="Address"
          style={[
            { flex: 1, height: '100%', color: theme.text, fontSize: large ? 18 : 16 },
            font('600'),
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
          ]}
        />
        {searching && !list.length && <ActivityIndicator color={theme.accent} />}
        {!!query && !(searching && !list.length) && (
          <Pressable accessibilityLabel="Clear address" hitSlop={10} onPress={() => setQuery('')}>
            <Icon name="close-circle" color="textSecondary" />
          </Pressable>
        )}
        {cta && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cta}
            onPress={() => (list[active] ? pick(list[active]) : input.current?.focus())}
            style={({ pressed }) => ({ height: height - 14, paddingHorizontal: 24, borderRadius: Radius.pill, backgroundColor: theme.primary, justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <T style={[{ color: theme.primaryText, fontSize: 16 }, font('700')]}>{cta}</T>
          </Pressable>
        )}
      </Row>

      {list.length > 0 && (
        <View style={[{ borderRadius: Radius.lg, backgroundColor: theme.card, overflow: 'hidden' }, elevation(2)]}>
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
                backgroundColor: pressed || (Platform.OS === 'web' && i === active) ? theme.backgroundElement : 'transparent',
                borderTopWidth: i ? 1 : 0,
                borderColor: theme.border,
              })}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.ice, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.needsNumber ? 'navigate' : 'home'} color="accent" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="label" numberOfLines={1}>{s.line1}</T>
                <T variant="caption" color="textSecondary" numberOfLines={1}>{s.line2}</T>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {eligible && !searching && !list.length && !error && !hint && (
        <T variant="caption" color="textSecondary">
          {hasNumber ? 'No match yet. Keep typing the street name, then the city.' : 'Start with your house number, e.g. 1234 Lyndale Ave S.'}
        </T>
      )}
      {hint && <T variant="caption" color="textSecondary">{hint}</T>}
      {error && <T variant="caption" color="danger">{error}</T>}
    </View>
  );
}
