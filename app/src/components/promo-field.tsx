import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { money } from '@/lib/format';
import type { Quote } from '@/lib/types';

import { Button, Icon, Input, Row, T } from './ui';

// "Add a promo code" in the order summary. `code` is the code the quote was priced with; the
// server answers with quote.promo (applied) or quote.promoError (invalid, expired, already used).
export function PromoField({ code, quote, error, onChange }: { code: string; quote: Quote | null; error?: string | null; onChange: (code: string) => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? code;
  const applied = quote?.promo && quote.promo.code === code ? quote.promo : null;
  const problem = draft == null && code ? (error ?? quote?.promoError ?? null) : null;

  const apply = () => {
    onChange(text);
    setDraft(null);
  };

  if (applied && draft == null && !error) {
    return (
      <Row gap={Spacing.two} style={{ backgroundColor: `${theme.success}1A`, borderRadius: Radius.md, padding: Spacing.three }}>
        <Icon name="pricetag" size={18} color="success" />
        <View style={{ flex: 1 }}>
          <T variant="label" color="success">{applied.code} applied</T>
          <T variant="caption" color="textSecondary">{money(applied.cents)} off this plow</T>
        </View>
        <Pressable onPress={() => onChange('')} accessibilityRole="button" hitSlop={8}>
          <T variant="label" color="textSecondary">Remove</T>
        </Pressable>
      </Row>
    );
  }
  if (!open && !code) {
    return (
      <Pressable onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }} accessibilityRole="button">
        <T variant="label" color="accent">+ Add a promo code</T>
      </Pressable>
    );
  }
  return (
    <Row gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}>
        <Input
          value={text}
          onChangeText={(t) => setDraft(t.toUpperCase())}
          placeholder="Promo code"
          accessibilityLabel="Promo code"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus={open && !code}
          returnKeyType="done"
          onSubmitEditing={apply}
          invalid={!!problem}
          hint={problem}
        />
      </View>
      <Button title={code && draft == null && !problem ? 'Checking…' : 'Apply'} size="md" kind="secondary" onPress={apply} disabled={!text.trim()} />
    </Row>
  );
}
