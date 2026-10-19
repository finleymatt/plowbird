import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { font, MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

// Soft, wide shadow for floating surfaces (cards over maps, sheets, the address bar).
export const elevation = (level: 1 | 2 = 1): ViewStyle =>
  Platform.select({
    web: { boxShadow: level === 1 ? '0 1px 2px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06)' : '0 8px 32px rgba(0,0,0,.16)' } as ViewStyle,
    default: { shadowColor: '#000', shadowOpacity: level === 1 ? 0.08 : 0.18, shadowRadius: level === 1 ? 12 : 24, shadowOffset: { width: 0, height: level === 1 ? 2 : 8 }, elevation: level * 4 },
  });

/* ---------- Text ---------- */

type Variant = 'hero' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'number';

const text = StyleSheet.create({
  hero: { fontSize: 44, lineHeight: 48, letterSpacing: -1.5, ...font('800') },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6, ...font('800') },
  heading: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, ...font('700') },
  body: { fontSize: 16, lineHeight: 22, ...font('400') },
  label: { fontSize: 15, lineHeight: 20, ...font('600') },
  caption: { fontSize: 13, lineHeight: 18, ...font('500') },
  number: { fontSize: 44, lineHeight: 50, letterSpacing: -1.5, fontVariant: ['tabular-nums'], ...font('800') },
});

// Inter ships one family per weight, so a fontWeight override picks the matching family.
const WEIGHTS = { normal: '400', bold: '700', '100': '400', '200': '400', '300': '400', '400': '400', '500': '500', '600': '600', '700': '700', '800': '800', '900': '800' } as const;

export function T({
  variant = 'body',
  color = 'text',
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: ThemeColor }) {
  const theme = useTheme();
  const weight = (StyleSheet.flatten(style) as TextStyle | undefined)?.fontWeight;
  return <Text style={[{ color: theme[color] }, text[variant], style, weight && font(WEIGHTS[weight as keyof typeof WEIGHTS] ?? '700')]} {...rest} />;
}

/* ---------- Layout ---------- */

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const inner = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: theme.background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: Spacing.six }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Row({ children, gap = Spacing.two, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

// Flat surface: gray fill on white, or a raised card when `raised` (e.g. floating over a map).
export function Card({
  children,
  style,
  onPress,
  raised,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  raised?: boolean;
}) {
  const theme = useTheme();
  const base = [
    styles.card,
    raised ? [{ backgroundColor: theme.card }, elevation(1)] : { backgroundColor: theme.backgroundElement },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: Spacing.four, marginBottom: Spacing.one }}>
      <T variant="heading" style={{ fontSize: 20 }}>{children}</T>
      {action}
    </Row>
  );
}

/* ---------- Controls ---------- */

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  size = 'lg',
  style,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg = { primary: theme.primary, dark: theme.inverse, secondary: theme.backgroundElement, ghost: 'transparent', danger: theme.backgroundElement }[kind];
  const fg = { primary: theme.primaryText, dark: theme.inverseText, secondary: theme.text, ghost: theme.text, danger: theme.danger }[kind];
  const height = { lg: 54, md: 46, sm: 36 }[size];
  const padX = { lg: Spacing.four, md: 20, sm: 14 }[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        { backgroundColor: bg, minHeight: height, paddingHorizontal: padX },
        kind === 'ghost' && hovered && { backgroundColor: theme.backgroundElement },
        (disabled || loading) && { opacity: 0.4 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Row gap={Spacing.two} style={{ justifyContent: 'center' }}>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={fg} />}
          <Text style={[{ color: fg, fontSize: size === 'sm' ? 14 : 16, letterSpacing: -0.1 }, font('700')]}>{title}</Text>
        </Row>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  sublabel,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  sublabel?: string;
}) {
  const theme = useTheme();
  const fg = selected ? theme.inverseText : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.inverse : theme.backgroundElement },
        pressed && { opacity: 0.8 },
      ]}>
      <Row gap={6}>
        {icon && <Ionicons name={icon} size={16} color={fg} />}
        <Text style={[{ color: fg, fontSize: 15 }, font('600')]}>{label}</Text>
      </Row>
      {sublabel && (
        <Text style={[{ color: selected ? theme.inverseText : theme.textSecondary, opacity: selected ? 0.75 : 1, fontSize: 12, marginTop: 2 }, font('500')]}>
          {sublabel}
        </Text>
      )}
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>{children}</View>;
}

export function Input({
  label,
  hint,
  invalid,
  right,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label?: string; hint?: string | null; invalid?: boolean; right?: ReactNode }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label && <T variant="caption" color="textSecondary" style={{ fontWeight: '600' }}>{label}</T>}
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            font('500'),
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: invalid ? theme.danger : focused ? theme.inverse : 'transparent',
            },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
            !!right && { paddingRight: 48 },
            style,
          ]}
          {...props}
        />
        {right && <View style={{ position: 'absolute', right: 14 }}>{right}</View>}
      </View>
      {hint && <T variant="caption" color={invalid ? 'danger' : 'textSecondary'}>{hint}</T>}
    </View>
  );
}

export function PasswordInput(props: TextInputProps & { label?: string; hint?: string | null; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      {...props}
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable onPress={() => setShown((s) => !s)} hitSlop={10} accessibilityLabel={shown ? 'Hide password' : 'Show password'}>
          <Icon name={shown ? 'eye-off-outline' : 'eye-outline'} color="textSecondary" />
        </Pressable>
      }
    />
  );
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'; icon?: IconName }) {
  const theme = useTheme();
  const color = { neutral: theme.textSecondary, primary: theme.primary, success: theme.success, warning: theme.warning, danger: theme.danger, accent: theme.accent }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tone === 'neutral' ? theme.backgroundElement : `${color}1F` }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={[{ color, fontSize: 12, letterSpacing: 0.1 }, font('700')]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginVertical: Spacing.three }} />;
}

export function Icon({ name, size = 20, color = 'text' }: { name: IconName; size?: number; color?: ThemeColor }) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={theme[color]} />;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <T variant="label" color="danger" style={{ marginTop: Spacing.two }}>
      {children}
    </T>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.six, backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  button: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 56,
    alignItems: 'center',
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 2,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
});
