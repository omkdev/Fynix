'use client';

import { useState } from 'react';
import Link from 'next/link';
import CategoryChart from '@/components/CategoryChart';

export default function DashboardPage() {
  const [monthlyTotal] = useState(0);
  // Placeholder: replace with real category data from API later
  const categoryData = [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-primary-600">
            Fynix
          </Link>
          <nav className="flex gap-4 text-slate-600">
            <span className="font-medium text-slate-900">Dashboard</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

        {/* Monthly total */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
            This month
          </h2>
          <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-3xl font-bold text-slate-900">
              ₹{monthlyTotal.toLocaleString()}
            </p>
            <p className="text-slate-500 text-sm mt-1">Total expenses</p>
          </div>
        </section>

        {/* Category chart */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
            By category
          </h2>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm min-h-[280px]">
            <CategoryChart data={categoryData} />
          </div>
        </section>

        {/* Live updates note */}
        <section>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
            Live updates
          </h2>
          <div className="rounded-xl bg-slate-100 border border-slate-200 p-4 text-slate-600 text-sm">
            WebSocket connection will show real-time expense updates (Phase 5).
          </div>
        </section>
      </main>
    </div>
  );
}
