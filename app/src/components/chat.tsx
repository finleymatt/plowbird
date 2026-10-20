import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import type { Chat, PendingMessage } from '@/lib/chat';
import { chatOpened } from '@/lib/chat-presence';
import type { Job } from '@/lib/types';

import { elevation, Icon, Row, T } from './ui';

const MAX_LENGTH = 1000;

// Tapped to send right away; ones ending in "…" fill the box so the rest can be typed.
const QUICK_REPLIES = {
  customer: ['I moved my car', 'Please clear the sidewalk too', 'Gate code is…'],
  driver: ['I’m here', 'Running 5 min late', 'Please move your car'],
};

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function dayAndTime(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return `${today ? 'Today' : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${clock(iso)}`;
}
const initials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2);

/** "Message Mike" button with an unread badge. `surface` for use on a gray card. */
export function MessageButton({ title, unread, onPress, surface, style }: { title: string; unread: number; onPress: () => void; surface?: boolean; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unread ? `${title}, ${unread} unread` : title}
      style={({ pressed }) => [
        { minHeight: 46, borderRadius: Radius.pill, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: surface ? theme.background : theme.backgroundElement },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}>
      <Row gap={Spacing.two}>
        <View>
          <Icon name="chatbubble-ellipses" size={20} />
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary, borderColor: surface ? theme.background : theme.backgroundElement }]}>
              <T style={[{ color: theme.primaryText, fontSize: 11, lineHeight: 14 }, font('700')]}>{unread > 9 ? '9+' : unread}</T>
            </View>
          )}
        </View>
        <T variant="label" style={font('700')}>{title}</T>
      </Row>
    </Pressable>
  );
}

/** The chat with the other person on a job, in a sheet over the job screen. */
export function ChatSheet({ job, chat, visible, onClose }: { job: Job; chat: Chat; visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const wide = width >= 700;
  const [draft, setDraft] = useState('');
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const { unread, markRead } = chat;

  const iAmDriver = user?.role === 'driver';
  const other = iAmDriver ? job.customer.name : job.driver?.name ?? 'your driver';
  const first = other.split(' ')[0];
  const subtitle = iAmDriver ? `Customer · ${job.property.address}` : `Your driver · ${job.driver?.vehicle ?? 'Plow truck'}`;

  useEffect(() => (visible ? chatOpened(job.id) : undefined), [visible, job.id]);
  useEffect(() => {
    if (visible && unread > 0) markRead();
  }, [visible, unread, markRead]);

  const submit = async (text = draft) => {
    if (!text.trim()) return;
    const typed = text === draft;
    if (typed) setDraft('');
    const ok = await chat.send(text);
    if (!ok && typed) setDraft(text);
  };

  const quick = (q: string) => {
    if (q.endsWith('…')) {
      setDraft(`${q.slice(0, -1)} `);
      input.current?.focus();
    } else submit(q);
  };

  const lastMine = [...chat.messages].reverse().find((m) => m.senderId === user?.id);

  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { justifyContent: wide ? 'center' : 'flex-end' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close chat" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 520, height: wide ? '82%' : '92%' }}>
          <View
            style={[
              { flex: 1, backgroundColor: theme.background, overflow: 'hidden', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl },
              wide && { borderRadius: Radius.xl },
              elevation(2),
            ]}>
            {/* Header */}
            <Row gap={Spacing.three} style={{ padding: Spacing.three, paddingBottom: Spacing.two }}>
              <View style={[styles.avatar, { backgroundColor: theme.inverse }]}>
                <T variant="label" style={{ color: theme.inverseText }}>{initials(other)}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T variant="heading" numberOfLines={1}>{other}</T>
                <T variant="caption" color="textSecondary" numberOfLines={1}>{subtitle}</T>
              </View>
              <Pressable onPress={onClose} accessibilityLabel="Close chat" hitSlop={8} style={[styles.close, { backgroundColor: theme.backgroundElement }]}>
                <Icon name="close" />
              </Pressable>
            </Row>
            <Row gap={6} style={[styles.privacy, { backgroundColor: theme.ice }]}>
              <Icon name="lock-closed" size={13} color="accent" />
              <T variant="caption" color="textSecondary" style={{ flex: 1 }}>Chat stays in Plowbird. Phone numbers are never shared.</T>
            </Row>

            {/* Messages */}
            <ScrollView
              ref={list}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: Spacing.three, gap: 3, flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}>
              {chat.messages.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four }}>
                  <View style={[styles.emptyIcon, { backgroundColor: theme.ice }]}>
                    <Icon name="chatbubbles-outline" size={28} color="accent" />
                  </View>
                  <T variant="heading">Message {first}</T>
                  <T color="textSecondary" style={{ textAlign: 'center' }}>
                    {iAmDriver ? 'Let them know when you’re close, or if their car is in the way.' : 'Share a gate code, ask about the sidewalk, or let them know you moved your car.'}
                  </T>
                </View>
              ) : (
                chat.messages.map((m, i) => {
                  const prev = chat.messages[i - 1];
                  const next = chat.messages[i + 1];
                  const gap = !prev || Date.parse(m.createdAt) - Date.parse(prev.createdAt) > 10 * 60_000;
                  const endOfGroup = !next || next.senderId !== m.senderId || Date.parse(next.createdAt) - Date.parse(m.createdAt) > 10 * 60_000;
                  return (
                    <View key={m.id}>
                      {gap && <T variant="caption" color="textSecondary" style={{ textAlign: 'center', marginVertical: Spacing.two }}>{dayAndTime(m.createdAt)}</T>}
                      <Bubble message={m} mine={m.senderId === user?.id} tail={endOfGroup} spaced={!gap && prev?.senderId !== m.senderId} />
                      {m === lastMine && (
                        <T variant="caption" color="textSecondary" style={{ alignSelf: 'flex-end', marginTop: 2, fontSize: 12 }}>
                          {m.pending ? 'Sending…' : m.readAt ? `Read ${clock(m.readAt)}` : 'Delivered'}
                        </T>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Composer */}
            {chat.open ? (
              <View style={{ paddingBottom: Math.max(insets.bottom, Spacing.two), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.two }}>
                  {QUICK_REPLIES[iAmDriver ? 'driver' : 'customer'].map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => quick(q)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.quick, { borderColor: theme.border, backgroundColor: pressed ? theme.backgroundElement : theme.background }]}>
                      <T variant="caption" style={[{ fontSize: 14 }, font('600')]}>{q}</T>
                    </Pressable>
                  ))}
                </ScrollView>
                {chat.error && (
                  <Pressable onPress={chat.clearError} style={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.two }}>
                    <T variant="caption" color="danger">{chat.error}</T>
                  </Pressable>
                )}
                <Row gap={Spacing.two} style={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.two, alignItems: 'flex-end' }}>
                  <TextInput
                    ref={input}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={`Message ${first}`}
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    maxLength={MAX_LENGTH}
                    accessibilityLabel={`Message ${first}`}
                    onKeyPress={(e) => {
                      // Web: Enter sends, Shift+Enter adds a line.
                      const ev = e.nativeEvent as { key: string; shiftKey?: boolean };
                      if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                        (e as unknown as { preventDefault: () => void }).preventDefault();
                        submit();
                      }
                    }}
                    style={[
                      styles.input,
                      font('500'),
                      { color: theme.text, backgroundColor: theme.backgroundElement },
                      Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
                    ]}
                  />
                  <Pressable
                    onPress={() => submit()}
                    disabled={!draft.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Send"
                    style={({ pressed }) => [styles.send, { backgroundColor: theme.accent, opacity: !draft.trim() ? 0.35 : pressed ? 0.8 : 1 }]}>
                    <Icon name="arrow-up" size={20} color="primaryText" />
                  </Pressable>
                </Row>
                {draft.length > MAX_LENGTH - 100 && (
                  <T variant="caption" color="textSecondary" style={{ paddingHorizontal: Spacing.three, paddingTop: 4 }}>{MAX_LENGTH - draft.length} characters left</T>
                )}
              </View>
            ) : (
              <View style={{ padding: Spacing.three, paddingBottom: Math.max(insets.bottom, Spacing.three), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
                <T variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>This chat closed 24 hours after the plow was done.</T>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Bubble({ message, mine, tail, spaced }: { message: PendingMessage; mine: boolean; tail: boolean; spaced: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bubble,
        mine
          ? { alignSelf: 'flex-end', backgroundColor: theme.accent, borderBottomRightRadius: tail ? 6 : Radius.lg }
          : { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement, borderBottomLeftRadius: tail ? 6 : Radius.lg },
        spaced && { marginTop: Spacing.two },
        message.pending && { opacity: 0.6 },
      ]}>
      <T style={{ color: mine ? '#FFFFFF' : theme.text }} selectable>{message.body}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(11,27,46,0.4)' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  privacy: { marginHorizontal: Spacing.three, marginBottom: Spacing.one, paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.sm },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  bubble: { maxWidth: '80%', borderRadius: Radius.lg, paddingVertical: 9, paddingHorizontal: 14 },
  quick: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingTop: 11, paddingBottom: 11, paddingHorizontal: Spacing.three, fontSize: 16 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -7, right: -9, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
});
