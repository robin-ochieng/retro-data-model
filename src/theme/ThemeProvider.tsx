import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme_mode';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyDomTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Derive userId if AuthProvider is present; fall back to null in tests or unauthenticated contexts
  let authUserId: string | null = null;
  try {
    authUserId = useAuth().user?.id ?? null;
  } catch {
    authUserId = null;
  }
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>(getSystemTheme());
  const mmRef = useRef<MediaQueryList | null>(null);
  const initialSyncDone = useRef(false);
  const userInteracted = useRef(false);

  // Load initial from profile or localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let initial: ThemeMode = 'system';
    if (authUserId) {
        const { data } = await supabase
          .from('profiles')
          .select('theme')
      .eq('id', authUserId)
          .maybeSingle();
        if (data && typeof (data as any).theme === 'string') initial = (data as any).theme as ThemeMode;
      } else {
        const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
        if (stored === 'light' || stored === 'dark' || stored === 'system') initial = stored;
      }
      if (!cancelled) {
        // Avoid clobbering if user already changed theme after mount
        if (!userInteracted.current) {
          setModeState(initial);
          const sys = getSystemTheme();
          const next = initial === 'system' ? sys : initial;
          setResolved(next);
          applyDomTheme(next);
        }
        initialSyncDone.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [authUserId]);

  // Listen to OS changes when mode === 'system'
  useEffect(() => {
    if (!mmRef.current && typeof window !== 'undefined' && window.matchMedia) {
      mmRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    }
    const mql = mmRef.current;
    if (!mql) return;
    const handler = (e: MediaQueryListEvent) => {
      if (mode === 'system') {
        const next = e.matches ? 'dark' : 'light';
        setResolved(next);
        applyDomTheme(next);
      }
    };
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
  userInteracted.current = true;
    setModeState(m);
    const sys = getSystemTheme();
    const next = m === 'system' ? sys : m;
    setResolved(next);
    applyDomTheme(next);
  }, []);

  // Persist debounced when mode changes (after initial load)
  useEffect(() => {
    if (!initialSyncDone.current) return;
    const id = setTimeout(async () => {
  if (authUserId) {
    await supabase.from('profiles').update({ theme: mode }).eq('id', authUserId);
      } else {
        localStorage.setItem(STORAGE_KEY, mode);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [mode, authUserId]);

  const value = useMemo<ThemeContextType>(() => ({
    mode,
    resolved,
    isDark: resolved === 'dark',
    setMode,
  }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
