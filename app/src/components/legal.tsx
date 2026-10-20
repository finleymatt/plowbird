import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Brand } from './landing';
import { Icon, Row, Screen, T } from './ui';

// Support contact shown on /contact, /terms and /privacy. The mailbox has to exist before launch
// (see "Before going live" in the README).
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@plowbird.app';
export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim() || null;

// Not decided yet. Fill these in once the business is registered; they show bracketed until then.
export const LEGAL_ENTITY = '[LEGAL ENTITY NAME]';
export const MAILING_ADDRESS = '[MAILING ADDRESS]';

export const LEGAL_UPDATED = 'October 19, 2026';

const mailto = (subject?: string) => `mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}` as Href;
const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}` as Href;

/* ---------- Page layout ---------- */

// A readable column for long text: the brand (back to home), a title and the body.
export function LegalPage({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <Screen contentStyle={{ maxWidth: 720, gap: Spacing.three, paddingTop: Spacing.four }}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Back to home" style={{ alignSelf: 'flex-start' }}>
        <Brand />
      </Pressable>
      <View style={{ gap: Spacing.two, marginTop: Spacing.four }}>
        <T variant="title" accessibilityRole="header">{title}</T>
        {intro}
      </View>
      {children}
      <LegalLinks />
    </Screen>
  );
}

export function Updated() {
  return <T variant="caption" color="textSecondary">Last updated {LEGAL_UPDATED}</T>;
}

// The "this is a draft" notice on Terms and Privacy. Remove once an attorney has signed off.
export function DraftNotice({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Row gap={Spacing.two} style={{ alignItems: 'flex-start', backgroundColor: theme.stormBg, borderColor: theme.stormBorder, borderWidth: 1, borderRadius: 12, padding: Spacing.three }}>
      <Icon name="alert-circle" size={20} color="warning" />
      <T variant="caption" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{children}</T>
    </Row>
  );
}

export function H({ children }: { children: ReactNode }) {
  return (
    <T variant="heading" accessibilityRole="header" style={{ fontSize: 20, marginTop: Spacing.three }}>
      {children}
    </T>
  );
}

export function P({ children, color = 'text' }: { children: ReactNode; color?: ThemeColor }) {
  return <T color={color} style={{ lineHeight: 25 }}>{children}</T>;
}

export function Bullets({ items }: { items: ReactNode[] }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      {items.map((item, i) => (
        <Row key={i} gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.textSecondary, marginTop: 10 }} />
          <T style={{ flex: 1, lineHeight: 25 }}>{item}</T>
        </Row>
      ))}
    </View>
  );
}

// Bold lead-in for a bullet or paragraph.
export function B({ children }: { children: ReactNode }) {
  return <T style={{ fontWeight: '700', lineHeight: 25 }}>{children}</T>;
}

export function A({ href, children }: { href: Href; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Link href={href} style={{ color: theme.accent, textDecorationLine: 'underline' }}>
      {children}
    </Link>
  );
}

export const EmailLink = ({ subject }: { subject?: string }) => <A href={mailto(subject)}>{SUPPORT_EMAIL}</A>;
export const PhoneLink = ({ phone }: { phone: string }) => <A href={tel(phone)}>{phone}</A>;

// Who we are and how to reach us, at the end of Terms and Privacy.
export function ContactBlock() {
  return (
    <P>
      {LEGAL_ENTITY} (“Plowbird”){'\n'}
      {MAILING_ADDRESS}
      {'\n'}Email: <EmailLink />
      {SUPPORT_PHONE ? (
        <>
          {'\n'}Phone: <PhoneLink phone={SUPPORT_PHONE} />
        </>
      ) : null}
    </P>
  );
}

function LegalLinks() {
  const theme = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderColor: theme.border, marginTop: Spacing.five, paddingTop: Spacing.three }}>
      <Row gap={Spacing.four} style={{ flexWrap: 'wrap' }}>
        <A href="/terms">Terms</A>
        <A href="/privacy">Privacy</A>
        <A href="/contact">Contact</A>
        <A href="/">Home</A>
      </Row>
    </View>
  );
}

/* ---------- Agreement line on sign-up and checkout ---------- */

export function AgreeLine({ action = 'continuing' }: { action?: string }) {
  return (
    <T variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
      By {action} you agree to the <A href="/terms">Terms</A> and <A href="/privacy">Privacy Policy</A>.
    </T>
  );
}
