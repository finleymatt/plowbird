import { useCallback, useEffect, useState } from 'react';

import { api } from './api';
import { useAuth, useSocketEvent } from './auth';
import type { ChatMessage, ChatThread, Job } from './types';

/** A message still on its way to the server: negative id, shown dimmed until it lands. */
export type PendingMessage = ChatMessage & { pending?: boolean };

// The chat on a job between the customer and its driver: history, live updates over the socket,
// sending, unread count and read receipts. Off (null thread) until a driver has the job.
export function useChat(job: Job | null) {
  const { user, socket } = useAuth();
  const jobId = job?.id;
  const driverId = job?.driver?.id;
  const enabled = !!jobId && !!driverId && job?.status !== 'cancelled';
  const [thread, setThread] = useState<{ key: string; messages: PendingMessage[]; open: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Keyed by job + driver: a released job's next driver gets a fresh thread.
  const key = enabled ? `${jobId}:${driverId}` : null;
  const [connects, setConnects] = useState(0);
  useSocketEvent('connect', () => setConnects((n) => n + 1));

  // Load on open and on every (re)connect, so nothing sent while offline is missed.
  useEffect(() => {
    if (!key) return;
    let current = true;
    api<ChatThread>(`/jobs/${jobId}/messages`)
      .then((t) => {
        if (current) setThread((cur) => ({ key, open: t.open, messages: [...t.messages, ...(cur?.key === key ? cur.messages.filter((m) => m.pending) : [])] }));
      })
      .catch(() => {
        // Not available (yet): leave the chat hidden.
      });
    return () => {
      current = false;
    };
  }, [key, jobId, socket, connects]);

  const add = (m: ChatMessage) =>
    setThread((cur) => (!cur || cur.messages.some((x) => x.id === m.id) ? cur : { ...cur, messages: [...cur.messages, m] }));

  useSocketEvent<ChatMessage>('message', (m) => {
    if (m.jobId === jobId) add(m);
  });
  useSocketEvent<{ jobId: number; readerId: number; readAt: string }>('messages:read', (e) => {
    if (e.jobId !== jobId) return;
    // The reader has now seen everything the other person sent.
    setThread((cur) => cur && { ...cur, messages: cur.messages.map((m) => (m.senderId !== e.readerId && !m.readAt && !m.pending ? { ...m, readAt: e.readAt } : m)) });
  });

  const send = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text || !jobId || !user) return false;
      setError(null);
      const temp: PendingMessage = { id: -Date.now(), jobId, senderId: user.id, body: text, createdAt: new Date().toISOString(), readAt: null, pending: true };
      setThread((cur) => cur && { ...cur, messages: [...cur.messages, temp] });
      try {
        const m = await api<ChatMessage>(`/jobs/${jobId}/messages`, { body: { body: text } });
        // The socket echo may have landed first; keep just one copy.
        setThread((cur) => cur && { ...cur, messages: cur.messages.some((x) => x.id === m.id) ? cur.messages.filter((x) => x.id !== temp.id) : cur.messages.map((x) => (x.id === temp.id ? m : x)) });
        return true;
      } catch (e: any) {
        setThread((cur) => cur && { ...cur, messages: cur.messages.filter((x) => x.id !== temp.id) });
        setError(e.message);
        return false;
      }
    },
    [jobId, user],
  );

  const live = thread && thread.key === key ? thread : null;
  const unread = live && user ? live.messages.filter((m) => m.senderId !== user.id && !m.readAt).length : 0;

  const markRead = useCallback(() => {
    if (!jobId || !user) return;
    setThread((cur) => cur && { ...cur, messages: cur.messages.map((m) => (m.senderId !== user.id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)) });
    api(`/jobs/${jobId}/messages/read`, { method: 'POST' }).catch(() => {});
  }, [jobId, user]);

  return { messages: live?.messages ?? [], open: live?.open ?? false, available: !!live, unread, send, markRead, error, clearError: () => setError(null) };
}

export type Chat = ReturnType<typeof useChat>;
