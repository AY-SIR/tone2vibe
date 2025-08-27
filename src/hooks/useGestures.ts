
import { useState, useEffect, useRef } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const useGestures = (element: React.RefObject<HTMLElement>) => {
  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true);
  const touchStart = useRef<TouchPoint | null>(null);
  const touchEnd = useRef<TouchPoint | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (!isSwipeEnabled) return;
    
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isSwipeEnabled || !touchStart.current) return;
    
    const touch = e.changedTouches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.timestamp - touchStart.current.timestamp;
    
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    if (deltaTime > maxSwipeTime) return;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY && absDeltaX > minSwipeDistance) {
      // Horizontal swipe
      const direction = deltaX > 0 ? 'right' : 'left';
      dispatchSwipeEvent(direction);
    } else if (absDeltaY > minSwipeDistance) {
      // Vertical swipe
      const direction = deltaY > 0 ? 'down' : 'up';
      dispatchSwipeEvent(direction);
    }
  };

  const dispatchSwipeEvent = (direction: string) => {
    if (element.current) {
      element.current.dispatchEvent(new CustomEvent('swipe', {
        detail: { direction }
      }));
    }
  };

  useEffect(() => {
    const el = element.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, isSwipeEnabled]);

  return {
    isSwipeEnabled,
    setIsSwipeEnabled
  };
};
