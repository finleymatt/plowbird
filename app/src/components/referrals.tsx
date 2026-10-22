import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, Share, View } from 'react-native';

import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { Property, ReferralRank, Referrals } from '@/lib/types';
import { useApi } from '@/lib/use-api';

import { Badge, Button, Card, ErrorText, Icon, Row, T, type IconName } from './ui';

// Referrals: "Give $10, get $10" and Snow Ranks. Rules and rewards live in server/src/referrals.js.

export const shareLink = (code: string) => `https://plowbird.app/?promo=${code}&utm_source=referral`;
const shareText = (code: string) =>
  `I use Plowbird to get my driveway plowed: order a local plow truck, watch it on the map, pay after it’s done. Here’s $10 off your first plow: ${shareLink(code)}`;

const RANK_ICON: Record<string, IconName> = {
  Snowflake: 'snow-outline',
  Flurry: 'snow',
  'Snowplow Scout': 'compass',
  'Storm Chaser': 'thunderstorm',
  'Blizzard Boss': 'trophy',
};

/** Share buttons: native share sheet (or copy on desktop web), text and email. */
export function ShareButtons({ code, compact }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(shareLink(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    const canNativeShare = Platform.OS !== 'web' || (typeof navigator !== 'undefined' && 'share' in navigator);
    if (!canNativeShare) return copy();
    try {
      await Share.share(Platform.OS === 'web' ? { message: shareText(code), url: shareLink(code) } : { message: shareText(code) });
    } catch {
      copy();
    }
  };
  const body = encodeURIComponent(shareText(code));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
      <Button title="Share link" icon="share-social" size={compact ? 'sm' : 'md'} onPress={share} style={{ flexGrow: 1 }} />
      <Button title={copied ? 'Copied!' : 'Copy link'} icon={copied ? 'checkmark' : 'copy'} kind="secondary" size={compact ? 'sm' : 'md'} onPress={copy} style={{ flexGrow: 1 }} />
      {!compact && (
        <>
          <Button title="Text" icon="chatbubble" kind="secondary" size="md" onPress={() => Linking.openURL(`sms:?&body=${body}`)} style={{ flexGrow: 1 }} />
          <Button
            title="Email"
            icon="mail"
            kind="secondary"
            size="md"
            onPress={() => Linking.openURL(`mailto:?subject=${encodeURIComponent('$10 off your first plow')}&body=${body}`)}
            style={{ flexGrow: 1 }}
          />
        </>
      )}
    </View>
  );
}

/** The rank ladder: where you are, what's next. */
function RankLadder({ ranks, qualified }: { ranks: ReferralRank[]; qualified: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      {ranks.slice(1).map((r) => {
        const reached = qualified >= r.at;
        return (
          <Row key={r.name} style={{ alignItems: 'flex-start', opacity: reached ? 1 : 0.85 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: reached ? theme.primary : theme.backgroundElement,
              }}>
              <Icon name={RANK_ICON[r.name] ?? 'star'} size={18} color={reached ? 'primaryText' : 'textSecondary'} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Row gap={6}>
                <T variant="label">{r.name}</T>
                <T variant="caption" color="textSecondary">· {r.at} {r.at === 1 ? 'neighbor' : 'neighbors'}</T>
                {reached && <Badge label="UNLOCKED" tone="success" />}
              </Row>
              <T variant="caption" color="textSecondary">{r.perk}</T>
            </View>
          </Row>
        );
      })}
    </View>
  );
}

/** Progress bar toward the next rank. */
function Progress({ s }: { s: Referrals }) {
  const theme = useTheme();
  const from = s.rank.at;
  const to = s.next?.at ?? s.qualified;
  const pct = s.next ? Math.max(0.04, (s.qualified - from) / (to - from)) : 1;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: theme.backgroundSelected, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: theme.primary, borderRadius: 5 }} />
      </View>
      <T variant="caption" color="textSecondary">
        {s.next
          ? `${s.next.remaining} more ${s.next.remaining === 1 ? 'neighbor' : 'neighbors'} to ${s.next.name}: ${s.next.perk}`
          : 'Top rank reached. Thank you for spreading the word ❄️'}
      </T>
    </View>
  );
}

/** The full referral hub for signed-in customers (the Invite tab). */
export function ReferralHub() {
  const theme = useTheme();
  const ref = useApi<Referrals>('/referrals');
  const s = ref.data;
  if (!s) return <T color="textSecondary">{ref.error ?? 'Loading…'}</T>;

  return (
    <View style={{ gap: Spacing.four }}>
      <Card raised style={{ gap: Spacing.three, backgroundColor: theme.inverse }}>
        <T variant="caption" style={[{ color: theme.inverseText, opacity: 0.7, letterSpacing: 1 }, font('700')]}>GIVE {money(s.friendCents)}, GET {money(s.referrerCents)}</T>
        <T style={[{ color: theme.inverseText, fontSize: 26, lineHeight: 31, letterSpacing: -0.6 }, font('800')]}>
          Your neighbors get {money(s.friendCents)} off their first plow. You get {money(s.referrerCents)} when they book.
        </T>
        <Pressable
          onPress={() => Clipboard.setStringAsync(s.code)}
          accessibilityLabel={`Your code ${s.code}. Tap to copy.`}
          style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.primary }}>
          <T style={[{ color: theme.inverseText, fontSize: 22, letterSpacing: 2 }, font('800')]}>{s.code}</T>
        </Pressable>
        <ShareButtons code={s.code} />
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
        {[
          { label: 'Your credit', value: money(s.creditCents), sub: 'comes off your next plow' },
          { label: 'Neighbors booked', value: String(s.qualified), sub: s.pending ? `${s.pending} signed up, not booked yet` : 'their first plow is done' },
          { label: 'Earned so far', value: money(s.earnedCents), sub: 'credit from referrals' },
        ].map((x) => (
          <Card key={x.label} style={{ flexGrow: 1, flexBasis: 150, gap: 2 }}>
            <T variant="caption" color="textSecondary">{x.label}</T>
            <T style={[{ fontSize: 26, letterSpacing: -0.8 }, font('800')]}>{x.value}</T>
            <T variant="caption" color="textSecondary">{x.sub}</T>
          </Card>
        ))}
      </View>

      <Rewards s={s} onChange={ref.reload} />

      <Card style={{ gap: Spacing.three }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T variant="caption" color="textSecondary">Your Snow Rank</T>
            <T variant="heading" style={{ fontSize: 22 }}>{s.rank.name}</T>
          </View>
          <Icon name={RANK_ICON[s.rank.name] ?? 'snow'} size={34} color="primary" />
        </Row>
        <Progress s={s} />
        <RankLadder ranks={s.ranks} qualified={s.qualified} />
      </Card>

      {s.neighbors.length > 0 && (
        <Card style={{ gap: Spacing.two }}>
          <T variant="heading">Your neighbors</T>
          {s.neighbors.map((n, i) => (
            <Row key={i} style={{ justifyContent: 'space-between' }}>
              <T>{n.name}</T>
              <Badge label={n.status === 'qualified' ? 'BOOKED · +$10' : 'SIGNED UP'} tone={n.status === 'qualified' ? 'success' : 'neutral'} />
            </Row>
          ))}
        </Card>
      )}

      <Leaderboard />

      <T variant="caption" color="textSecondary" style={{ lineHeight: 19 }}>
        How it works: a neighbor uses your link or code on their first plow and gets {money(s.friendCents)} off. When that plow is done, {money(s.referrerCents)} lands on
        your account and comes off your next plow automatically (your driver is still paid in full). New customers and homes only, one per household. Storm Pass
        plows and free demo orders don’t count. Credit has no cash value. Rewards are capped at 25 referrals a year.
      </T>
    </View>
  );
}

/** Free Storm Pass months to claim on a driveway. */
function Rewards({ s, onChange }: { s: Referrals; onChange: () => void }) {
  const theme = useTheme();
  const available = s.rewards.filter((r) => r.status === 'available');
  const props = useApi<Property[]>(available.length ? '/properties' : null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!s.rewards.length) return null;

  const redeem = async (rewardId: number, propertyId: number) => {
    setBusy(propertyId);
    setError(null);
    try {
      await api(`/referrals/rewards/${rewardId}/redeem`, { body: { propertyId } });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: Spacing.two }}>
      {s.rewards.map((r) => (
        <Card key={r.id} style={{ gap: Spacing.two, borderWidth: 2, borderColor: r.status === 'available' ? theme.primary : theme.border }}>
          <Row>
            <Icon name="gift" color={r.status === 'available' ? 'primary' : 'textSecondary'} />
            <T variant="heading" style={{ flex: 1 }}>A free month of Storm Pass</T>
            <Badge label={r.status === 'available' ? 'READY TO CLAIM' : 'CLAIMED'} tone={r.status === 'available' ? 'primary' : 'neutral'} />
          </Row>
          {r.status === 'redeemed' ? (
            <T variant="caption" color="textSecondary">{r.note}</T>
          ) : !props.data ? (
            <T variant="caption" color="textSecondary">Loading your driveways…</T>
          ) : props.data.length === 0 ? (
            <>
              <T variant="caption" color="textSecondary">Add a driveway first, then claim your free month.</T>
              <Button title="Add a driveway" kind="secondary" size="sm" onPress={() => router.push('/customer/add-property')} />
            </>
          ) : (
            <>
              <T variant="caption" color="textSecondary">
                Unlocked at {r.milestone} neighbors. We plow automatically every storm for a month. Already have Storm Pass? Your next month is free.
              </T>
              <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
                {props.data.map((p) => (
                  <Button key={p.id} title={`Use on ${p.label}`} size="sm" loading={busy === p.id} onPress={() => redeem(r.id, p.id)} />
                ))}
              </Row>
            </>
          )}
        </Card>
      ))}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/** "Which town is winning?" Public: neighbors booked by city, last 12 months. */
export function Leaderboard({ title = 'Which town is winning?' }: { title?: string }) {
  const theme = useTheme();
  const rows = useApi<{ city: string; referrals: number }[]>('/referrals/leaderboard').data ?? [];
  if (!rows.length) return null;
  const max = rows[0].referrals;
  return (
    <Card style={{ gap: Spacing.two }}>
      <T variant="heading">{title}</T>
      <T variant="caption" color="textSecondary">Neighbors who booked through a referral, by town.</T>
      {rows.map((r, i) => (
        <View key={r.city} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="label">{i === 0 ? '🏆 ' : ''}{r.city}</T>
            <T variant="caption" style={font('700')}>{r.referrals}</T>
          </Row>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.backgroundElement }}>
            <View style={{ width: `${(r.referrals / max) * 100}%`, height: '100%', borderRadius: 3, backgroundColor: i === 0 ? theme.primary : theme.accent }} />
          </View>
        </View>
      ))}
    </Card>
  );
}

/** Small "share with neighbors" card, e.g. after a plow is done. */
export function ShareNudge({ title = 'Know a neighbor who’d want this?' }: { title?: string }) {
  const s = useApi<Referrals>('/referrals').data;
  if (!s) return null;
  return (
    <Card style={{ gap: Spacing.two }}>
      <Row>
        <Icon name="gift" color="primary" />
        <T variant="heading" style={{ flex: 1 }}>{title}</T>
      </Row>
      <T variant="caption" color="textSecondary">
        Give them {money(s.friendCents)} off their first plow with code <T variant="caption" style={font('700')}>{s.code}</T>. You get {money(s.referrerCents)} when
        they book{s.next ? `, and you’re ${s.next.remaining} away from ${s.next.name}` : ''}.
      </T>
      <ShareButtons code={s.code} compact />
    </Card>
  );
}
