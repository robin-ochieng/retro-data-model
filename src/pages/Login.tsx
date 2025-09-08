import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (user) {
      // Return to previous protected route if provided
      const to = (location.state as any)?.from ?? '/';
      navigate(to, { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      // navigation will occur via AuthProvider effect
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    mode === 'signup' ? Boolean(name && email && password) : Boolean(email && password);

  const fieldErrors = useMemo(() => {
    const errs: { name?: string; email?: string; password?: string } = {};
    if (mode === 'signup' && touched.name && !name) errs.name = 'Name is required';
    if (touched.email && !email) errs.email = 'Email is required';
    if (touched.password && !password) errs.password = 'Password is required';
    return errs;
  }, [mode, name, email, password, touched]);

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto] bg-background text-foreground">
      {/* Header (navbar) */}
      <header className="w-full border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14 md:h-16">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative px-4">
        {/* subtle background gradient */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 opacity-60 dark:opacity-50 bg-[radial-gradient(1200px_600px_at_50%_-100px,rgba(59,130,246,0.08),rgba(255,255,255,0)),linear-gradient(to_bottom,rgba(15,23,42,0.04),rgba(255,255,255,0))] dark:bg-[radial-gradient(1200px_600px_at_50%_-100px,rgba(59,130,246,0.10),rgba(0,0,0,0)),linear-gradient(to_bottom,rgba(255,255,255,0.03),rgba(0,0,0,0))]" />
        </div>

        <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-3.75rem)] grid place-items-center py-6 sm:py-8">
          <form
            className="w-full max-w-[420px] bg-card rounded-xl ring-1 ring-border/50 shadow-lg p-6 md:px-8 md:py-8 space-y-6"
            onSubmit={handleSubmit}
            noValidate
            aria-describedby={error ? 'auth-error' : undefined}
          >
            <div className="flex justify-center"><Logo className="h-8 md:h-10 w-auto" /></div>
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === 'signup' ? 'Create your account' : 'Sign in'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your credentials to continue.
              </p>
            </div>

            {error && (
              <div
                id="auth-error"
                className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded px-3 py-2"
                role="status"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <div className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    className="block w-full h-11 rounded-md border border-border bg-background dark:bg-muted px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, name: true }))}
                    aria-invalid={fieldErrors.name ? 'true' : 'false'}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    disabled={loading}
                  />
                  {fieldErrors.name && (
                    <p id="name-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="block w-full h-11 rounded-md border border-border bg-background dark:bg-muted px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  aria-invalid={fieldErrors.email ? 'true' : 'false'}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  disabled={loading}
                />
                {fieldErrors.email && (
                  <p id="email-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="block w-full h-11 rounded-md border border-border bg-background dark:bg-muted px-3 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                    aria-invalid={fieldErrors.password ? 'true' : 'false'}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-r-md"
                    onClick={() => setShowPassword(s => !s)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.584 10.59A2 2 0 0 0 12 14a2 2 0 0 0 1.414-.586"/><path d="M9.88 5.09A10.967 10.967 0 0 1 12 5c5 0 9 4 10 7- .29.72-.74 1.51-1.33 2.28m-2.13 2.02C16.51 17.49 14.38 19 12 19c-5 0-9-4-10-7a10.68 10.68 0 0 1 3.12-3.99"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                className="w-full h-11 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={loading || !canSubmit}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                    <span>Processing…</span>
                  </span>
                ) : (
                  <span>{mode === 'signup' ? 'Create account' : 'Sign in'}</span>
                )}
              </button>

              <div className="text-center text-sm text-muted-foreground">
                {mode === 'signin' ? (
                  <>Don’t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="font-medium text-foreground hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="font-medium text-foreground hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>

              <div className="text-center">
                <a href="/help" className="text-xs text-muted-foreground hover:underline" title="Help & User Guide">Help</a>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 bg-background text-muted-foreground text-xs sm:text-sm">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:py-3 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Kenbright Re</span>
          <nav className="flex items-center gap-4">
            <a href="/privacy" className="hover:underline">Privacy</a>
            <a href="/terms" className="hover:underline">Terms</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
