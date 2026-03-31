'use client';

/**
 * Offline cache management for PWA.
 * Manages the medical FAQ cache for offline access.
 */

const CACHE_KEY = 'medos-offline-faq';
const CACHE_VERSION = 1;

interface CachedData {
  version: number;
  timestamp: number;
  faqs: Array<{ question: string; answer: string }>;
}

export function saveFAQToCache(
  faqs: Array<{ question: string; answer: string }>
): void {
  if (typeof localStorage === 'undefined') return;

  const data: CachedData = {
    version: CACHE_VERSION,
    timestamp: Date.now(),
    faqs,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage full — clear old data and retry
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Silently fail if storage is completely full
    }
  }
}

export function loadFAQFromCache(): Array<{
  question: string;
  answer: string;
}> | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const data: CachedData = JSON.parse(raw);
    if (data.version !== CACHE_VERSION) return null;

    // Cache is valid for 30 days
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp > thirtyDays) return null;

    return data.faqs;
  } catch {
    return null;
  }
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function onConnectivityChange(
  callback: (online: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
