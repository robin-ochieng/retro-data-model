import { useEffect, useRef } from 'react';

// enabled: when false, timers are not scheduled and pending timers are cleared
export function useAutosave<T>(value: T, onSave: (value: T) => void, delay = 900, enabled = true) {
  // In the browser, setTimeout returns a number
  const timerRef = useRef<number | null>(null);
  const latestValue = useRef(value);
  const latestOnSave = useRef(onSave);

  // Keep the latest value in sync immediately so unmount flush captures the newest edits
  latestValue.current = value;

  // Keep a stable reference to onSave
  useEffect(() => {
    latestOnSave.current = onSave;
  }, [onSave]);

  useEffect(() => {
    latestValue.current = value;
    // Always clear any existing timer first
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // If disabled, do not schedule a new timer
    if (!enabled) {
      return () => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
    // Schedule the save when enabled
    timerRef.current = window.setTimeout(() => {
      latestOnSave.current(latestValue.current);
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, delay, enabled]);

  // Ensure we don't lose the last edits when the component unmounts (e.g., user navigates tabs)
  useEffect(() => {
    return () => {
      // If a save is pending and autosave is enabled, flush it synchronously on unmount
      if (enabled && timerRef.current !== null) {
        try {
          latestOnSave.current(latestValue.current);
        } finally {
          // No need to clearTimeout; component is unmounting
        }
      }
    };
  }, [enabled]);
}
