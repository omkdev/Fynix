'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const authModes = {
  password: 'password',
  oauth: 'oauth',
  magic: 'magic',
};

const authMethodMeta = {
  [authModes.password]: {
    label: 'Email & Password',
    hint: 'Use your email and password to sign in.',
  },
  [authModes.oauth]: {
    label: 'Google or GitHub',
    hint: 'Use your existing social account.',
  },
  [authModes.magic]: {
    label: 'Email Link',
    hint: 'Get a one-time sign-in link in your inbox.',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState(authModes.password);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicEmail, setMagicEmail] = useState('');

  const pageTitle = useMemo(() => {
    if (mode === authModes.oauth) return 'Continue with Google or GitHub';
    if (mode === authModes.magic) return 'Get a secure sign-in link';
    return 'Sign in with your email and password';
  }, [mode]);

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to sign in. Please try again.');
      }

      if (payload?.accessToken) {
        localStorage.setItem('fynix_access_token', payload.accessToken);
      }
      if (payload?.refreshToken) {
        localStorage.setItem('fynix_refresh_token', payload.refreshToken);
      }

      setStatus({ type: 'success', message: 'Login successful. Redirecting to dashboard...' });
      router.push('/dashboard');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMagicLink(event) {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to send magic link right now.');
      }

      setStatus({
        type: 'success',
        message: 'Magic link sent. Check your inbox (Resend integration).',
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function handleOAuth(provider) {
    setStatus({ type: '', message: '' });
    window.location.href = `/api/auth/oauth/${provider}`;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <Link href="/" className="text-lg font-semibold text-primary-600">
            Fynix
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Login</h1>
          <p className="mt-1 text-sm text-slate-600">{pageTitle}</p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="mb-2 px-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sign-in method</p>
            <p className="text-xs text-slate-500">Choose the option that is easiest for you.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setMode(authModes.password)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                mode === authModes.password
                  ? 'border-primary-200 bg-white text-slate-900 shadow-sm'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
              }`}
            >
              <p className="font-medium">{authMethodMeta[authModes.password].label}</p>
              <p className="mt-1 text-xs text-slate-500">{authMethodMeta[authModes.password].hint}</p>
            </button>
            <button
              type="button"
              onClick={() => setMode(authModes.oauth)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                mode === authModes.oauth
                  ? 'border-primary-200 bg-white text-slate-900 shadow-sm'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
              }`}
            >
              <p className="font-medium">{authMethodMeta[authModes.oauth].label}</p>
              <p className="mt-1 text-xs text-slate-500">{authMethodMeta[authModes.oauth].hint}</p>
            </button>
            <button
              type="button"
              onClick={() => setMode(authModes.magic)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                mode === authModes.magic
                  ? 'border-primary-200 bg-white text-slate-900 shadow-sm'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
              }`}
            >
              <p className="font-medium">{authMethodMeta[authModes.magic].label}</p>
              <p className="mt-1 text-xs text-slate-500">{authMethodMeta[authModes.magic].hint}</p>
            </button>
          </div>
        </div>

        {mode === authModes.password && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          
          </form>
        )}

        {mode === authModes.oauth && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Continue with GitHub
            </button>
           
          </div>
        )}

        {mode === authModes.magic && (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label htmlFor="magic-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="magic-email"
                type="email"
                value={magicEmail}
                onChange={(event) => setMagicEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Sending link...' : 'Send magic link'}
            </button>
           
          </form>
        )}

        {status.message && (
          <div
            className={`mt-5 rounded-lg border px-3 py-2 text-sm ${
              status.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </main>
  );
}
