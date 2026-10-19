import { createContext, useCallback, useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

import { api, API_URL, setApiToken } from './api';
import { storage } from './storage';
import type { AppNotification, Role, User } from './types';

const TOKEN_KEY = 'plowbird.token';

type SignUpInput = { role: Role; name: string; email: string; password: string; phone?: string; vehicle?: string };
export type SocialInput = { provider: 'google' | 'apple'; idToken: string; name?: string; role?: Role };

type AuthState = {
  user: User | null;
  loading: boolean;
  socket: Socket | null;
  toast: AppNotification | null;
  dismissToast: () => void;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  /** Continue with Google / Apple. `created` is true when this made a new account. */
  socialSignIn: (input: SocialInput) => Promise<{ user: User; created: boolean }>;
  signOut: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Tagged with the token it was opened for, so a signed-out session never sees a stale socket.
  const [conn, setConn] = useState<{ token: string; socket: Socket } | null>(null);
  const socket = conn && conn.token === token ? conn.socket : null;
  const [toast, setToast] = useState<AppNotification | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore session on launch.
  useEffect(() => {
    (async () => {
      const saved = await storage.get(TOKEN_KEY);
      if (saved) {
        setApiToken(saved);
        try {
          setUser(await api<User>('/me'));
          setToken(saved);
        } catch {
          setApiToken(null);
          await storage.remove(TOKEN_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  // One realtime connection per signed-in session.
  useEffect(() => {
    if (!token) return;
    const s = io(API_URL, { auth: { token }, transports: ['websocket'] });
    s.on('notification', (n: AppNotification) => {
      setToast(n);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 6000);
    });
    s.on('connect', () => setConn({ token, socket: s }));
    return () => {
      s.disconnect();
    };
  }, [token]);

  const accept = useCallback(async (res: { token: string; user: User }) => {
    await storage.set(TOKEN_KEY, res.token);
    setApiToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => api<{ token: string; user: User }>('/auth/login', { body: { email, password } }).then(accept),
    [accept],
  );
  const signUp = useCallback(
    (input: SignUpInput) => api<{ token: string; user: User }>('/auth/register', { body: input }).then(accept),
    [accept],
  );
  const socialSignIn = useCallback(
    async (input: SocialInput) => {
      const res = await api<{ token: string; user: User; created: boolean }>('/auth/social', { body: input });
      return { user: await accept(res), created: res.created };
    },
    [accept],
  );
  const signOut = useCallback(async () => {
    await storage.remove(TOKEN_KEY);
    setApiToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, socket, toast, dismissToast: () => setToast(null), signIn, signUp, socialSignIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useSocketEvent<T = any>(event: string, handler: (payload: T) => void) {
  const { socket } = useAuth();
  const onEvent = useEffectEvent(handler);
  useEffect(() => {
    if (!socket) return;
    const fn = (p: T) => onEvent(p);
    socket.on(event, fn);
    return () => {
      socket.off(event, fn);
    };
  }, [socket, event]);
}
