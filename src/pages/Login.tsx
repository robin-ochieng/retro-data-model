import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 flex flex-col">
      {/* Header (navbar) */}
      <header className="w-full sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/60 bg-white dark:bg-gray-900 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          {/* Empty right side to keep spacing consistent with Home header */}
          <span className="text-sm text-gray-700 dark:text-gray-300" aria-hidden="true"></span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        <div className="w-full h-full flex items-center justify-center py-8">
          <form
            className="bg-white dark:bg-gray-800 p-8 rounded shadow w-full max-w-md"
            onSubmit={handleSubmit}
          >
            <div className="flex justify-center mb-4"><Logo /></div>
            <h1 className="text-2xl font-bold mb-6 text-center">{mode === 'signup' ? 'Create your account' : 'Sign in'}</h1>

            {mode === 'signup' && (
              <>
                <label className="block mb-2 font-medium" htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring focus:border-blue-500"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </>
            )}

            <label className="block mb-2 font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring focus:border-blue-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <label className="block mb-2 font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring focus:border-blue-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />

            {error && <div className="text-red-600 mb-2" role="alert">{error}</div>}

            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || !canSubmit}
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
              {mode === 'signin' ? (
                <>
                  Don’t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-blue-600 hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-blue-600 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mt-auto border-t bg-white/70 dark:bg-gray-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>© {new Date().getFullYear()} Kenbright Re</span>
          <span className="inline-flex items-center gap-1">
            <span className="opacity-80">Powered by</span>
            <strong className="font-semibold">Kenbright AI</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
