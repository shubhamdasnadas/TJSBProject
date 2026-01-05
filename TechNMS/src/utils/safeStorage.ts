export const safeStorage = {
  get(key: string) {
    try {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string) {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(key, value);
    } catch {}
  },

  remove(key: string) {
    try {
      if (typeof window === "undefined") return;
      localStorage.removeItem(key);
    } catch {}
  },
};
