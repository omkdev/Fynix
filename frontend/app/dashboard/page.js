'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CategoryChart from '@/components/CategoryChart';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function DashboardPage() {
  const router = useRouter();
  const [monthlyTotal] = useState(0);
  const [viewerEmail, setViewerEmail] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessionError, setSessionError] = useState('');
  // Placeholder: replace with real category data from API later
  const categoryData = [];
  const viewerName = viewerEmail ? viewerEmail.split('@')[0] : 'there';

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      try {
        setSessionError('');
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || 'Session is invalid.');
        }

        if (isMounted) {
          setViewerEmail(payload?.user?.email || '');
        }
      } catch (_error) {
        if (isMounted) {
          setSessionError('Your session has expired. Please login again.');
          router.replace('/login');
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    verifySession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      router.replace('/login');
      setIsLoggingOut(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-slate-600 bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-sm">
          Checking your session...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-primary-600">
            Fynix
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">Dashboard</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Overview</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Welcome back, {viewerName}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Here is your spending snapshot for this month. Connect expenses to unlock full insights.
          </p>
          {viewerEmail && (
            <p className="mt-3 text-sm text-slate-500">
              Signed in as <span className="font-medium text-slate-700">{viewerEmail}</span>
            </p>
          )}
          {sessionError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {sessionError}
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">This month</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(monthlyTotal)}</p>
            <p className="mt-1 text-sm text-slate-500">Total expenses</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{categoryData.length}</p>
            <p className="mt-1 text-sm text-slate-500">Active spending categories</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-3 text-lg font-semibold text-emerald-600">Session active</p>
            <p className="mt-1 text-sm text-slate-500">Live sync ready for Phase 5</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">By category</h2>
            <p className="mt-1 text-sm text-slate-600">Visual category split for this month.</p>
            <div className="mt-4 min-h-[280px] rounded-lg border border-slate-200 bg-slate-50 p-2">
              <CategoryChart data={categoryData} />
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent activity</h2>
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">No activity yet</p>
              <p className="mt-1 text-sm text-slate-500">
                New expenses and updates will appear here once you start tracking.
              </p>
            </div>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Go to home
            </Link>
          </aside>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-700">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Live updates</h2>
            <p className="mt-2">
              WebSocket connection will show real-time expense updates in the dashboard once the live feed
              module is enabled.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Need help?</h2>
            <p className="mt-2 text-sm text-slate-600">Review policies or contact support directly.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/privacy"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Contact
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
