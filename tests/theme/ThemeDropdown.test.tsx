import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import ThemeToggle from '../../src/components/ThemeToggle';

describe('Theme dropdown', () => {
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

  it('opens, selects Dark, applies class, and closes', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /theme/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // Select Dark
    const darkItem = await screen.findByRole('menuitemradio', { name: /dark/i });
    await user.click(darkItem);

    // menu closed
    expect(button).toHaveAttribute('aria-expanded', 'false');
    // html has dark
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
