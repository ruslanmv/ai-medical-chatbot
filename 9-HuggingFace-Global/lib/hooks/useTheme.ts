'use client';

import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDomClass(dark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

const STORAGE_KEY = 'medos-theme';

/**
 * Lightweight theme hook for the HuggingFace Space.
 * Defaults to "light" on first visit. Users can toggle to dark or auto.
 * Choice is persisted in localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'light';
    setThemeState(stored);
    const dark = stored === 'dark' || (stored === 'system' && systemPrefersDark());
    setResolved(dark ? 'dark' : 'light');
    applyDomClass(dark);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      setResolved(e.matches ? 'dark' : 'light');
      applyDomClass(e.matches);
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    const dark = t === 'dark' || (t === 'system' && systemPrefersDark());
    setResolved(dark ? 'dark' : 'light');
    applyDomClass(dark);
  }, []);

  return { theme, resolved, setTheme };
}
