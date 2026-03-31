'use client';

/**
 * Touch gesture utilities for mobile interactions.
 */

export function hapticFeedback(
  style: 'light' | 'medium' | 'heavy' = 'light'
): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;

  const patterns: Record<string, number> = {
    light: 10,
    medium: 20,
    heavy: 40,
  };

  navigator.vibrate(patterns[style] || 10);
}

export interface SwipeResult {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
}

/**
 * Create a swipe detector for an element.
 */
export function createSwipeDetector(
  element: HTMLElement,
  onSwipe: (result: SwipeResult) => void,
  threshold: number = 50
): () => void {
  let startX = 0;
  let startY = 0;

  function handleTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - startX;
    const diffY = endY - startY;

    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (absDiffX < threshold && absDiffY < threshold) return;

    if (absDiffX > absDiffY) {
      onSwipe({
        direction: diffX > 0 ? 'right' : 'left',
        distance: absDiffX,
      });
    } else {
      onSwipe({
        direction: diffY > 0 ? 'down' : 'up',
        distance: absDiffY,
      });
    }
  }

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}
