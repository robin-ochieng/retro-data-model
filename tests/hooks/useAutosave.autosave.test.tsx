import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useState, useEffect } from 'react';
import { useAutosave } from '@/hooks/useAutosave';

function AutosaveHarness({ initial, delay = 300, enabled = true, onSave }: { initial: string; delay?: number; enabled?: boolean; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  useAutosave(value, onSave, delay, enabled);
  // expose setter via effect on window for testing
  useEffect(() => {
    (window as any).__setVal = setValue;
  }, []);
  return <div data-testid="val">{value}</div>;
}

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    // cleanup test hook
    delete (window as any).__setVal;
  });

  it('debounces and calls onSave with latest value', async () => {
    const onSave = vi.fn();
    render(<AutosaveHarness initial="A" onSave={onSave} delay={300} />);

    // Change immediately to cancel initial timer, then again before delay
    await act(async () => {
      (window as any).__setVal('B');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    await act(async () => {
      (window as any).__setVal('C');
    });
    act(() => {
      vi.advanceTimersByTime(200); // total since last change = 200 (< 300)
    });

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(120); // now >= 320 since last change
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenLastCalledWith('C');
  });

  it('flushes pending save on unmount', async () => {
    const onSave = vi.fn();
    const { unmount } = render(<AutosaveHarness initial="A" onSave={onSave} />);
    await act(async () => {
      (window as any).__setVal('Z');
      await Promise.resolve();
    });
    // unmount before timer fires
    act(() => unmount());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenLastCalledWith('Z');
  });
});
