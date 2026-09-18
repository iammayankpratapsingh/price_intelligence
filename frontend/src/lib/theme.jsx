import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'pi.theme';

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch { /* ignore */ }
    return systemPrefersDark();
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  const value = useMemo(() => ({ dark, toggle }), [dark, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
