import { useEffect, useRef } from 'react';

const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Calls `onIdle` once `limitMs` has elapsed without user activity while `active` is true.
 * Uses a wall-clock timestamp checked on an interval and on tab focus, so it also fires
 * correctly after the laptop sleeps or the tab is throttled in the background.
 */
export function useInactivity(active: boolean, limitMs: number, onIdle: () => void): void {
  const lastActivity = useRef(0);
  const cb = useRef(onIdle);
  useEffect(() => {
    cb.current = onIdle;
  });

  useEffect(() => {
    if (!active) return;
    lastActivity.current = Date.now();
    let fired = false;

    const check = () => {
      if (!fired && Date.now() - lastActivity.current >= limitMs) {
        fired = true;
        cb.current();
      }
    };
    const mark = () => {
      check(); // if we were already idle (e.g. waking from sleep), sign out instead of extending
      if (!fired) lastActivity.current = Date.now();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };

    EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(check, 15_000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, mark, { capture: true }));
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [active, limitMs]);
}
