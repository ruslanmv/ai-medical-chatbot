'use client';

/**
 * Mobile viewport utilities.
 * Fixes iOS Safari 100vh issue and handles keyboard.
 */

export function initViewport(): (() => void) | undefined {
  if (typeof window === 'undefined') return;

  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  function handleResize() {
    setVH();
  }

  function handleVisualViewport() {
    if (window.visualViewport) {
      const vh = window.visualViewport.height * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
  }

  setVH();
  window.addEventListener('resize', handleResize);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleVisualViewport);
  }

  return () => {
    window.removeEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleVisualViewport);
    }
  };
}

/**
 * Detect if virtual keyboard is open (heuristic).
 */
export function isKeyboardOpen(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.visualViewport) {
    return window.visualViewport.height < window.innerHeight * 0.75;
  }
  return false;
}
