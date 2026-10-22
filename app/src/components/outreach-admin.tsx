import { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import type { OutreachListKey, OutreachMeta, OutreachRow } from '@/lib/types';
import { useApi } from '@/lib/use-api';

import { Badge, Button, Card, ErrorText, Icon, Input, Row, T } from './ui';

// Staff outreach tracker (/admin → Outreach): drivers to recruit, partners, flyer spots and events,
// and commercial lots. Every change saves to the server (server/src/outreach.js).

const OWNERS = ['Matt', 'Danny'];
const GOOD = new Set(['approved', 'running', 'won', 'posted', 'done', 'applied', 'quoted']);
const BAD = new Set(['not_interested', 'declined', 'lost', 'not_allowed']);
const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const tone = (s: string, first: string) => (s === first ? 'neutral' : GOOD.has(s) ? 'success' : BAD.has(s) ? 'danger' : s === 'refresh_due' ? 'warning' : 'accent');
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const shortDate = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const csvCell = (v: unknown) => {
  const s = v == null ? '' : /^[=+\-@]/.test(String(v)) ? `'${v}` : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function Outreach({ wide }: { wide: boolean }) {
  const theme = useTheme();
  const meta = useApi<OutreachMeta>('/admin/outreach/meta');
  const [list, setList] = useState<OutreachListKey>('driver');
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [due, setDue] = useState(false);
  const [adding, setAdding] = useState(false);
  const rows = useApi<OutreachRow[]>(`/admin/outreach?list=${list}${status ? `&status=${status}` : ''}${due ? '&due=1' : ''}&q=${encodeURIComponent(q.trim())}`);
  const m = meta.data?.lists.find((l) => l.key === list);
  const today = meta.data?.today ?? new Date().toISOString().slice(0, 10);
  const refresh = () => {
    rows.reload();
    meta.reload();
  };

  const download = () => {
    const cols: (keyof OutreachRow)[] = ['name', 'status', 'owner', 'followUp', 'category', 'city', 'area', 'address', 'contact', 'phone', 'email', 'website', 'notes', 'lastContactedAt', 'source'];
    const csv = [cols.join(','), ...(rows.data ?? []).map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `plowbird-outreach-${list}-${today}.csv`;
    a.click();
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two }}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <T variant="title">Outreach</T>
          <T variant="caption" color="textSecondary">Who we’re working on. Changes save for both of you. Follow-ups that are due float to the top.</T>
        </View>
        <Row gap={Spacing.two}>
          {Platform.OS === 'web' && !!rows.data?.length && <Button title="CSV" icon="download" kind="secondary" size="sm" onPress={download} />}
          <Button title={adding ? 'Close' : 'Add'} icon={adding ? 'close' : 'add'} size="sm" onPress={() => setAdding((v) => !v)} />
        </Row>
      </Row>

      {/* Lists */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {(meta.data?.lists ?? []).map((l) => {
          const on = l.key === list;
          return (
            <Pressable
              key={l.key}
              onPress={() => {
                setList(l.key);
                setStatus(null);
                setAdding(false);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ flexGrow: 1, flexBasis: wide ? 0 : '46%', padding: Spacing.three, borderRadius: Radius.md, borderWidth: 2, borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.ice : theme.card, gap: 2 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="label">{l.label}</T>
                {l.due > 0 && <Badge label={`${l.due} DUE`} tone="warning" />}
              </Row>
              <T style={[{ fontSize: 24, letterSpacing: -0.6 }, font('800')]}>{l.total}</T>
              <T variant="caption" color="textSecondary" numberOfLines={1}>{l.hint}</T>
            </Pressable>
          );
        })}
      </View>

      {adding && m && (
        <NewRow
          list={list}
          statuses={m.statuses}
          onDone={() => {
            setAdding(false);
            refresh();
          }}
        />
      )}

      {/* Filters */}
      <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
        <View style={{ flexGrow: 1, flexBasis: 220 }}>
          <Input value={q} onChangeText={setQ} placeholder="Search name, city, notes…" autoCapitalize="none" />
        </View>
        <Chip on={due} onPress={() => setDue((v) => !v)} label={`Due today${m?.due ? ` · ${m.due}` : ''}`} icon="alarm" />
      </Row>
      {m && (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Chip on={!status} onPress={() => setStatus(null)} label={`All · ${m.total}`} />
          {m.statuses.map((s) => (
            <Chip key={s} on={status === s} onPress={() => setStatus(status === s ? null : s)} label={`${label(s)} · ${m.byStatus[s] ?? 0}`} />
          ))}
        </Row>
      )}

      <T variant="caption" color="textSecondary">{rows.loading && !rows.data ? 'Loading…' : `${rows.data?.length ?? 0} shown`}</T>
      {(rows.data ?? []).map((r) => (
        <OutreachCard key={r.id} row={r} statuses={m?.statuses ?? []} today={today} onChange={refresh} />
      ))}
      {rows.data?.length === 0 && <T color="textSecondary">Nothing here. Try another filter, or add one.</T>}
    </View>
  );
}

function Chip({ on, onPress, label: text, icon }: { on: boolean; onPress: () => void; label: string; icon?: 'alarm' }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', paddingHorizontal: 12, minHeight: 36, borderRadius: Radius.pill, borderWidth: 2, borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.ice : theme.card }}>
      {icon && <Icon name={icon} size={14} color={on ? 'accent' : 'textSecondary'} />}
      <T variant="caption" style={font('700')}>{text}</T>
    </Pressable>
  );
}

type Draft = Pick<OutreachRow, 'name' | 'category' | 'city' | 'area' | 'address' | 'contact' | 'phone' | 'email' | 'website' | 'notes'>;
const EDIT_FIELDS: { key: keyof Draft; label: string; multiline?: boolean; half?: boolean }[] = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Type', half: true },
  { key: 'city', label: 'City', half: true },
  { key: 'contact', label: 'Contact person / role' },
  { key: 'phone', label: 'Phone', half: true },
  { key: 'email', label: 'Email', half: true },
  { key: 'website', label: 'Website or link' },
  { key: 'address', label: 'Address', half: true },
  { key: 'area', label: 'Area served', half: true },
  { key: 'notes', label: 'Notes', multiline: true },
];
const draftOf = (r: Partial<OutreachRow>): Draft => Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, r[f.key] ?? ''])) as Draft;

function Fields({ draft, set }: { draft: Draft; set: (d: Draft) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
      {EDIT_FIELDS.map((f) => (
        <View key={f.key} style={{ flexBasis: f.half ? 200 : '100%', flexGrow: 1 }}>
          <Input
            label={f.label}
            value={draft[f.key] ?? ''}
            onChangeText={(v) => set({ ...draft, [f.key]: v })}
            multiline={f.multiline}
            autoCapitalize={f.key === 'email' || f.key === 'website' ? 'none' : undefined}
            style={[{ backgroundColor: theme.background }, f.multiline && { minHeight: 90, paddingTop: 12 }]}
          />
        </View>
      ))}
    </View>
  );
}

function NewRow({ list, statuses, onDone }: { list: OutreachListKey; statuses: string[]; onDone: () => void }) {
  const [draft, setDraft] = useState<Draft>(draftOf({}));
  const [status, setStatus] = useState(statuses[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/admin/outreach', { body: { list, status, ...draft } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card raised style={{ gap: Spacing.three }}>
      <T variant="heading">Add to this list</T>
      <Fields draft={draft} set={setDraft} />
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {statuses.map((s) => (
          <Chip key={s} on={status === s} onPress={() => setStatus(s)} label={label(s)} />
        ))}
      </Row>
      <ErrorText>{error}</ErrorText>
      <Button title="Save" icon="checkmark" onPress={save} loading={busy} />
    </Card>
  );
}

function OutreachCard({ row, statuses, today, onChange }: { row: OutreachRow; statuses: string[]; today: string; onChange: () => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(draftOf(row));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const activity = useApi<{ id: number; author: string; body: string; createdAt: string }[]>(open ? `/admin/outreach/${row.id}/activity` : null);
  // Fresh data from the server (after a save): reset the form to it.
  // Only when the saved fields actually changed, so logging a note doesn't wipe unsaved edits.
  const saved = JSON.stringify(draftOf(row));
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) {
    setSeen(saved);
    setDraft(draftOf(row));
  }
  const dirty = EDIT_FIELDS.some((f) => (draft[f.key] ?? '') !== (row[f.key] ?? ''));
  const overdue = !!row.followUp && row.followUp <= today;

  const patch = async (what: string, body: object) => {
    setBusy(what);
    setError(null);
    try {
      await api(`/admin/outreach/${row.id}`, { method: 'PATCH', body });
      onChange();
      activity.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    setBusy('note');
    try {
      await api(`/admin/outreach/${row.id}/activity`, { body: { body: note.trim() } });
      setNote('');
      activity.reload();
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    if (Platform.OS === 'web' && !window.confirm(`Delete ${row.name}? This can’t be undone.`)) return;
    await api(`/admin/outreach/${row.id}`, { method: 'DELETE' });
    onChange();
  };

  const detailLines = Object.entries(row.details ?? {}).filter(([k]) => k !== 'source_url');
  return (
    <Card style={{ gap: Spacing.two, borderWidth: overdue ? 2 : 0, borderColor: theme.warning }}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ gap: 4 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label">{row.name}</T>
            <T variant="caption" color="textSecondary">{[row.category?.replace(/_/g, ' '), row.city ?? row.area].filter(Boolean).join(' · ') || ' '}</T>
          </View>
          <Badge label={label(row.status).toUpperCase()} tone={tone(row.status, statuses[0])} />
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="textSecondary" />
        </Row>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {row.followUp && <Badge label={`${overdue ? 'DUE' : 'FOLLOW UP'} ${shortDate(row.followUp).toUpperCase()}`} tone={overdue ? 'warning' : 'neutral'} icon="alarm" />}
          {row.owner && <Badge label={row.owner.toUpperCase()} tone="accent" icon="person" />}
          {row.details?.when && <Badge label={row.details.when.slice(0, 40)} icon="calendar" />}
          {row.activityCount > 0 && <Badge label={`${row.activityCount} NOTES`} icon="document-text" />}
        </Row>
      </Pressable>

      {/* Quick contact actions, always visible */}
      <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
        {row.phone && <Button title={row.phone} icon="call" kind="secondary" size="sm" onPress={() => Linking.openURL(`tel:${row.phone!.replace(/[^\d+]/g, '')}`)} />}
        {row.email && <Button title="Email" icon="mail" kind="secondary" size="sm" onPress={() => Linking.openURL(`mailto:${row.email}`)} />}
        {row.website && /^https?:/.test(row.website) && <Button title="Website" icon="open" kind="secondary" size="sm" onPress={() => Linking.openURL(row.website!.split(/\s;\s|\s/)[0])} />}
      </Row>

      {open && (
        <View style={{ gap: Spacing.three, paddingTop: Spacing.two, borderTopWidth: 1, borderColor: theme.border }}>
          <View style={{ gap: 6 }}>
            <T variant="caption" color="textSecondary" style={font('700')}>STATUS</T>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {statuses.map((s) => (
                <Chip key={s} on={row.status === s} onPress={() => s !== row.status && patch('status', { status: s })} label={label(s)} />
              ))}
            </Row>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four }}>
            <View style={{ gap: 6 }}>
              <T variant="caption" color="textSecondary" style={font('700')}>FOLLOW UP</T>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {[
                  ['Tomorrow', 1],
                  ['3 days', 3],
                  ['1 week', 7],
                  ['2 weeks', 14],
                ].map(([t, n]) => (
                  <Chip key={t} on={row.followUp === plusDays(today, n as number)} onPress={() => patch('follow', { followUp: plusDays(today, n as number) })} label={t as string} />
                ))}
                {row.followUp && <Chip on={false} onPress={() => patch('follow', { followUp: null })} label="Clear" />}
              </Row>
            </View>
            <View style={{ gap: 6 }}>
              <T variant="caption" color="textSecondary" style={font('700')}>OWNER</T>
              <Row gap={6}>
                {OWNERS.map((o) => (
                  <Chip key={o} on={row.owner === o} onPress={() => patch('owner', { owner: row.owner === o ? null : o })} label={o} />
                ))}
              </Row>
            </View>
          </View>

          {detailLines.length > 0 && (
            <View style={{ gap: 4, backgroundColor: theme.backgroundElement, borderRadius: Radius.md, padding: Spacing.two }}>
              {detailLines.map(([k, v]) => (
                <T key={k} variant="caption"><T variant="caption" style={font('700')}>{label(k)}: </T>{v}</T>
              ))}
            </View>
          )}

          <Fields draft={draft} set={setDraft} />
          {dirty && (
            <Row gap={Spacing.two}>
              <Button title="Save changes" icon="checkmark" onPress={() => patch('fields', draft)} loading={busy === 'fields'} style={{ flex: 1 }} />
              <Button title="Undo" kind="secondary" onPress={() => setDraft(draftOf(row))} />
            </Row>
          )}
          <ErrorText>{error}</ErrorText>

          <View style={{ gap: Spacing.two }}>
            <T variant="caption" color="textSecondary" style={font('700')}>ACTIVITY</T>
            <Row gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Input value={note} onChangeText={setNote} placeholder="Log a call, email or note…" onSubmitEditing={addNote} style={{ backgroundColor: theme.background }} />
              </View>
              <Button title="Log" onPress={addNote} loading={busy === 'note'} disabled={!note.trim()} />
            </Row>
            {(activity.data ?? []).map((a) => (
              <View key={a.id} style={{ gap: 2 }}>
                <T variant="caption" color="textSecondary">
                  {a.author} · {new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </T>
                <T variant="caption">{a.body}</T>
              </View>
            ))}
          </View>

          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="caption" color="textSecondary">
              {row.updatedBy ? `Last edited by ${row.updatedBy}` : `From ${row.source ?? 'import'}`}
              {row.details?.source_url ? ' · source in CSV' : ''}
            </T>
            <Pressable onPress={remove} accessibilityRole="button">
              <T variant="caption" color="danger">Delete</T>
            </Pressable>
          </Row>
        </View>
      )}
    </Card>
  );
}
