import { useEffect, useRef } from 'react';

export function useAutosave<T>(value: T, onSave: (value: T) => void, delay = 900) {
  // In the browser, setTimeout returns a number
  const timerRef = useRef<number | null>(null);
  const latestValue = useRef(value);
  const latestOnSave = useRef(onSave);

  // Keep a stable reference to onSave
  useEffect(() => {
    latestOnSave.current = onSave;
  }, [onSave]);

  useEffect(() => {
    latestValue.current = value;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      latestOnSave.current(latestValue.current);
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, delay]);
}
