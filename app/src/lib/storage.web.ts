// Web: SecureStore isn't available, so fall back to localStorage.
const safe = <T>(fn: () => T, fallback: T) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const storage = {
  get: async (key: string) => safe(() => window.localStorage.getItem(key), null),
  set: async (key: string, value: string) => safe(() => window.localStorage.setItem(key, value), undefined),
  remove: async (key: string) => safe(() => window.localStorage.removeItem(key), undefined),
};
