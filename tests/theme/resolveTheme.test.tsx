import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider';

function Dummy() {
  const { setMode } = useTheme();
  React.useEffect(() => {
    setMode('dark');
  }, [setMode]);
  return null;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes('dark') ? false : true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    document.documentElement.classList.remove('dark');
  });

  it('applies dark class when set to dark', async () => {
    render(
      <ThemeProvider>
        <Dummy />
      </ThemeProvider>
    );
    // Allow effects to run
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
  });
});
