import React from 'react';
import Logo from '../../components/Logo';

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto] bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1 focus:rounded focus:bg-card focus:ring-2 focus:ring-primary">Skip to content</a>
      <header className="w-full border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14 md:h-16">
          <Logo />
          <a href="/" className="text-sm text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">Home</a>
        </div>
      </header>
      <main id="main" className="px-4">
        {children}
      </main>
      <footer className="w-full border-t border-border/40 bg-background text-muted-foreground text-xs sm:text-sm">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:py-3 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Retrocession Hub</span>
          <nav className="flex items-center gap-4">
            <a href="/privacy" className="hover:underline">Privacy</a>
            <a href="/terms" className="hover:underline">Terms</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
