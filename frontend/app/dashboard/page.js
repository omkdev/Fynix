'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CategoryChart from '@/components/CategoryChart';

const EXPENSE_CATEGORIES = [
  'Food',
  'Dining',
  'Coffee',
  'Groceries',
  'Rent',
  'Home',
  'Utilities',
  'Bills',
  'Internet',
  'Mobile',
  'Transport',
  'Fuel',
  'Parking',
  'Travel',
  'Subscription',
  'Insurance',
  'Health',
  'Pharmacy',
  'Education',
  'Shopping',
  'Beauty',
  'Personal Care',
  'Fitness',
  'Entertainment',
  'Family',
  'Childcare',
  'Pets',
  'EMI',
  'Loan',
  'Tax',
  'Investment',
  'Charity',
  'Gifts',
  'Misc',
];
const SESSION_LOADER_MIN_MS = 4500;

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function DashboardPage() {
  const router = useRouter();
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [viewerEmail, setViewerEmail] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseFormError, setExpenseFormError] = useState('');
  const [expenseFormSuccess, setExpenseFormSuccess] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    merchant: '',
    category: '',
    paymentMethod: '',
  });
  const viewerName = viewerEmail ? viewerEmail.split('@')[0] : 'there';

  function formatOccurredAt(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  async function fetchExpenses(limit = 50) {
    const response = await fetch(`/api/expenses?limit=${limit}`, {
      credentials: 'include',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'Unable to load expenses.');
    }
    return Array.isArray(payload?.expenses) ? payload.expenses : [];
  }

  async function openHistoryModal() {
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const expenses = await fetchExpenses(200);
      setExpenseHistory(expenses);
      setRecentExpenses(expenses.slice(0, 5));
    } catch (error) {
      setHistoryError(error.message || 'Unable to load expense history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const loadingStartedAt = Date.now();

    async function loadSummary() {
      setIsLoadingSummary(true);
      setSummaryError('');
      try {
        const response = await fetch('/api/expenses/summary', {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load expense summary.');
        }

        if (isMounted) {
          setMonthlyTotal(Number(payload?.monthlyTotal || 0));
          setCategoryData(Array.isArray(payload?.categoryData) ? payload.categoryData : []);
          setExpenseCount(Number(payload?.expenseCount || 0));
        }
      } catch (error) {
        if (isMounted) {
          setSummaryError(error.message || 'Unable to load expense summary.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
      }
    }

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
          await loadSummary();
          try {
            const expenses = await fetchExpenses(5);
            if (isMounted) {
              setRecentExpenses(expenses);
            }
          } catch (error) {
            if (isMounted) {
              setHistoryError(error.message || 'Unable to load recent activity.');
            }
          }
        }
      } catch (_error) {
        if (isMounted) {
          setSessionError('Your session has expired. Please login again.');
          router.replace('/login');
        }
      } finally {
        const elapsedMs = Date.now() - loadingStartedAt;
        const remainingMs = Math.max(0, SESSION_LOADER_MIN_MS - elapsedMs);
        if (remainingMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingMs));
        }
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

  function handleExpenseInputChange(event) {
    const { name, value } = event.target;
    setExpenseForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleExpenseSubmit(event) {
    event.preventDefault();
    setExpenseFormError('');
    setExpenseFormSuccess('');

    const parsedAmount = Number(expenseForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setExpenseFormError('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          description: expenseForm.description || undefined,
          merchant: expenseForm.merchant || undefined,
          category: expenseForm.category || undefined,
          paymentMethod: expenseForm.paymentMethod || undefined,
          autoCategorize: !expenseForm.category,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to add expense.');
      }

      const summary = payload?.summary || {};
      setMonthlyTotal(Number(summary?.monthlyTotal || 0));
      setCategoryData(Array.isArray(summary?.categoryData) ? summary.categoryData : []);
      setExpenseCount(Number(summary?.expenseCount || 0));
      if (payload?.expense) {
        setRecentExpenses((prev) => [payload.expense, ...prev].slice(0, 5));
        setExpenseHistory((prev) => [payload.expense, ...prev]);
      }
      setExpenseForm({
        amount: '',
        description: '',
        merchant: '',
        category: '',
        paymentMethod: '',
      });
      setExpenseFormSuccess('Expense added successfully.');
    } catch (error) {
      setExpenseFormError(error.message || 'Unable to add expense.');
    } finally {
      setIsSubmittingExpense(false);
    }
  }

  if (isCheckingSession) {
    return (
      <>
        <style jsx global>{`
          @keyframes fynixLogoFloat {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-22px);
            }
          }
        `}</style>
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <Image
            src="/assets/fynix-logo-mark.png"
            alt="Fynix logo"
            width={110}
            height={110}
            className="[animation:fynixLogoFloat_2.8s_ease-in-out_infinite]"
            priority
          />
        </main>
      </>
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
            <p className="mt-3 text-lg font-semibold text-emerald-600">
              {isLoadingSummary ? 'Loading data...' : 'Summary ready'}
            </p>
            <p className="mt-1 text-sm text-slate-500">{expenseCount} expenses in selected month</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">By category</h2>
            <p className="mt-1 text-sm text-slate-600">Visual category split for this month.</p>
            {summaryError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {summaryError}
              </div>
            )}
            <div className="mt-4 min-h-[280px] rounded-lg border border-slate-200 bg-slate-50 p-2">
              <CategoryChart data={categoryData} />
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Add expense</h2>
            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="amount" className="mb-1 block text-xs font-medium text-slate-600">
                  Amount (INR)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={expenseForm.amount}
                  onChange={handleExpenseInputChange}
                  placeholder="120"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div>
                <label htmlFor="description" className="mb-1 block text-xs font-medium text-slate-600">
                  Description
                </label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  value={expenseForm.description}
                  onChange={handleExpenseInputChange}
                  placeholder="Coffee at cafe"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="merchant" className="mb-1 block text-xs font-medium text-slate-600">
                    Merchant
                  </label>
                  <input
                    id="merchant"
                    name="merchant"
                    type="text"
                    value={expenseForm.merchant}
                    onChange={handleExpenseInputChange}
                    placeholder="Starbucks"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="mb-1 block text-xs font-medium text-slate-600">
                    Category (optional)
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={expenseForm.category}
                    onChange={handleExpenseInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="">Auto categorize</option>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="paymentMethod" className="mb-1 block text-xs font-medium text-slate-600">
                  Payment method
                </label>
                <input
                  id="paymentMethod"
                  name="paymentMethod"
                  type="text"
                  value={expenseForm.paymentMethod}
                  onChange={handleExpenseInputChange}
                  placeholder="UPI / Card / Cash"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingExpense}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingExpense ? 'Adding expense...' : 'Add expense'}
              </button>
            </form>

            {expenseFormError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {expenseFormError}
              </div>
            )}
            {expenseFormSuccess && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {expenseFormSuccess}
              </div>
            )}

            <div className="mt-5">
              <button
                type="button"
                onClick={openHistoryModal}
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-primary-600 hover:underline"
              >
                Recent activity
              </button>
              <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                {recentExpenses.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {recentExpenses.map((expense) => (
                      <li key={expense.id} className="text-sm text-slate-700">
                        {formatCurrency(expense.amount)} - {expense.category || 'Uncategorized'}
                      </li>
                    ))}
                  </ul>
                )}
                {historyError && (
                  <p className="mt-2 text-xs text-red-600">{historyError}</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </main>

      {isHistoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => setIsHistoryModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">All activity</h3>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {isLoadingHistory ? (
                <p className="text-sm text-slate-500">Loading history...</p>
              ) : historyError ? (
                <p className="text-sm text-red-600">{historyError}</p>
              ) : expenseHistory.length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {expenseHistory.map((expense) => (
                    <li
                      key={expense.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</span>
                        <span className="text-xs text-slate-500">{formatOccurredAt(expense.occurredAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {expense.description || expense.merchant || 'No description'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {expense.category || 'Uncategorized'}
                        {expense.paymentMethod ? ` - ${expense.paymentMethod}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
