'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const magicToken = searchParams.get('magic_token');
  const oauthCode = searchParams.get('code');
  const oauthState = searchParams.get('state');
  const oauthError = searchParams.get('oauth_error');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [magicEmail, setMagicEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timerId = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [resendCooldown]);

  useEffect(() => {
    if (!magicToken) return;

    let isActive = true;

    async function verifyMagicToken() {
      setIsLoading(true);
      setStatus({ type: '', message: '' });

      try {
        const response = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: magicToken }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || 'Magic link is invalid or expired.');
        }

        if (isActive) {
          setStatus({ type: 'success', message: 'Magic link verified. Redirecting to dashboard...' });
          router.push('/dashboard');
        }
      } catch (error) {
        if (isActive) {
          setStatus({ type: 'error', message: error.message });
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    verifyMagicToken();
    return () => {
      isActive = false;
    };
  }, [magicToken, router]);

  useEffect(() => {
    if (!oauthError) return;
    setStatus({ type: 'error', message: oauthError });
  }, [oauthError]);

  useEffect(() => {
    if (!oauthCode || !oauthState) return;

    setIsLoading(true);
    setStatus({ type: '', message: '' });
    const query = new URLSearchParams({
      code: oauthCode,
      state: oauthState,
    });
    window.location.href = `/api/auth/oauth/google/callback?${query.toString()}`;
  }, [oauthCode, oauthState]);

  async function handleMagicLink(event) {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: magicEmail }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to send magic link right now.');
      }

      setStatus({
        type: 'success',
        message: 'If an account exists, we have sent a sign-in link to that email.',
      });
      setResendCooldown(30);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleLogin() {
    setStatus({ type: '', message: '' });
    window.location.href = '/api/auth/oauth/google';
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <Link href="/" className="text-lg font-semibold text-primary-600">
            Fynix
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Login</h1>
          <p className="mt-1 text-sm text-slate-600">Continue with Google or use a secure email link.</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-wide text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

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
            disabled={isLoading || resendCooldown > 0}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading
              ? 'Sending link...'
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Continue with Email (magic link)'}
          </button>
          <p className="text-xs text-slate-500">We will send a secure sign-in link to your email.</p>
        </form>

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
