import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, clearToken } from "../api";
import CategoryChart from "../components/CategoryChart";
import "./Dashboard.css";

const EXPENSE_CATEGORIES = [
  "Food","Dining","Coffee","Groceries","Rent","Home","Utilities","Bills","Internet","Mobile",
  "Transport","Fuel","Parking","Travel","Subscription","Insurance","Health","Pharmacy",
  "Education","Shopping","Beauty","Personal Care","Fitness","Entertainment","Family",
  "Childcare","Pets","EMI","Loan","Tax","Investment","Charity","Gifts","Misc","Uncategorized",
];

function formatCurrency(v) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
}

function formatDate(v) {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [viewerEmail, setViewerEmail] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [form, setForm] = useState({ amount: "", description: "", merchant: "", category: "", paymentMethod: "" });

  const viewerName = viewerEmail ? viewerEmail.split("@")[0] : "there";

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const me = await api.get("/api/auth/me");
        if (!mounted) return;
        setViewerEmail(me?.user?.email || "");

        // Load summary
        setIsLoadingSummary(true);
        const summary = await api.get("/api/expenses/summary");
        if (mounted) {
          setMonthlyTotal(Number(summary?.total || 0));
          setCategoryData(Array.isArray(summary?.byCategory) ? summary.byCategory.map(c => ({ name: c._id, value: c.total })) : []);
          setExpenseCount(Number(summary?.byCategory?.reduce((s, c) => s + c.count, 0) || 0));
        }

        // Load recent
        const recent = await api.get("/api/expenses");
        if (mounted) setRecentExpenses(recent.slice(0, 5));
      } catch {
        clearToken();
        navigate("/login");
      } finally {
        if (mounted) { setIsCheckingSession(false); setIsLoadingSummary(false); }
      }
    }
    init();
    return () => { mounted = false; };
  }, [navigate]);

  async function handleLogout() {
    setIsLoggingOut(true);
    clearToken();
    navigate("/login");
  }

  async function openHistory() {
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    setHistoryError("");
    try {
      const all = await api.get("/api/expenses");
      setExpenseHistory(all);
    } catch (e) {
      setHistoryError(e.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    const parsed = Number(form.amount);
    if (!isFinite(parsed) || parsed <= 0) { setFormError("Please enter a valid amount greater than 0."); return; }
    setIsSubmitting(true);
    try {
      const expense = await api.post("/api/expenses", {
        amount: parsed,
        description: form.description || undefined,
        merchant: form.merchant || undefined,
        category: form.category || undefined,
        paymentMethod: form.paymentMethod || undefined,
      });
      setRecentExpenses(prev => [expense, ...prev].slice(0, 5));
      setMonthlyTotal(prev => prev + parsed);
      setExpenseCount(prev => prev + 1);
      setForm({ amount: "", description: "", merchant: "", category: "", paymentMethod: "" });
      setFormSuccess("Expense added successfully.");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="dash-loading">
        <div className="dash-spinner" />
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-header-inner">
          <Link to="/" className="dash-brand">Fynix</Link>
          <div className="dash-header-right">
            <span className="dash-label">Dashboard</span>
            <button onClick={handleLogout} disabled={isLoggingOut} className="btn-signout">
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="dash-main">
        {/* Welcome */}
        <section className="dash-card">
          <p className="overline-label">Overview</p>
          <h1 className="dash-welcome">Welcome back, {viewerName}</h1>
          <p className="dash-welcome-sub">Here is your spending snapshot for this month.</p>
          {viewerEmail && <p className="dash-email">Signed in as <strong>{viewerEmail}</strong></p>}
        </section>

        {/* Stats */}
        <section className="dash-stats">
          <div className="stat-card">
            <p className="stat-label">This month</p>
            <p className="stat-value">{formatCurrency(monthlyTotal)}</p>
            <p className="stat-sub">Total expenses</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Categories</p>
            <p className="stat-value">{categoryData.length}</p>
            <p className="stat-sub">Active spending categories</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Status</p>
            <p className="stat-value green">{isLoadingSummary ? "Loading..." : "Summary ready"}</p>
            <p className="stat-sub">{expenseCount} expenses this month</p>
          </div>
        </section>

        {/* Chart + Form */}
        <section className="dash-content">
          <div className="chart-card">
            <h2 className="content-label">By category</h2>
            <p className="content-sub">Visual category split for this month.</p>
            {summaryError && <div className="error-box">{summaryError}</div>}
            <div className="chart-wrap">
              <CategoryChart data={categoryData} />
            </div>
          </div>

          <aside className="form-card">
            <h2 className="content-label">Add expense</h2>
            <form onSubmit={handleSubmit} className="expense-form">
              <div className="form-group">
                <label htmlFor="amount" className="form-label">Amount (INR)</label>
                <input id="amount" name="amount" type="number" min="0.01" step="0.01" required
                  value={form.amount} onChange={handleInput} placeholder="120" className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="description" className="form-label">Description</label>
                <input id="description" name="description" type="text"
                  value={form.description} onChange={handleInput} placeholder="Coffee at cafe" className="form-input" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="merchant" className="form-label">Merchant</label>
                  <input id="merchant" name="merchant" type="text"
                    value={form.merchant} onChange={handleInput} placeholder="Starbucks" className="form-input" />
                </div>
                <div className="form-group">
                  <label htmlFor="category" className="form-label">Category</label>
                  <select id="category" name="category" value={form.category} onChange={handleInput} className="form-input">
                    <option value="">Auto categorize</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="paymentMethod" className="form-label">Payment method</label>
                <input id="paymentMethod" name="paymentMethod" type="text"
                  value={form.paymentMethod} onChange={handleInput} placeholder="UPI / Card / Cash" className="form-input" />
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-submit">
                {isSubmitting ? "Adding expense..." : "Add expense"}
              </button>
            </form>

            {formError && <div className="error-box mt-3">{formError}</div>}
            {formSuccess && <div className="success-box mt-3">{formSuccess}</div>}

            <div className="recent-section">
              <button type="button" onClick={openHistory} className="recent-label-btn">Recent activity</button>
              <div className="recent-box">
                {recentExpenses.length === 0
                  ? <p className="empty-text">No activity yet.</p>
                  : <ul className="recent-list">
                      {recentExpenses.map(e => (
                        <li key={e.id} className="recent-item">
                          {formatCurrency(e.amount)} — {e.category || "Uncategorized"}
                        </li>
                      ))}
                    </ul>
                }
                {historyError && <p className="error-sm">{historyError}</p>}
              </div>
            </div>
          </aside>
        </section>
      </main>

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="modal-overlay" onClick={() => setIsHistoryOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">All activity</h3>
              <button type="button" onClick={() => setIsHistoryOpen(false)} className="modal-close">Close</button>
            </div>
            <div className="modal-body">
              {isLoadingHistory ? <p className="empty-text">Loading history...</p>
                : historyError ? <p className="error-sm">{historyError}</p>
                : expenseHistory.length === 0 ? <p className="empty-text">No activity yet.</p>
                : <ul className="history-list">
                    {expenseHistory.map(e => (
                      <li key={e.id} className="history-item">
                        <div className="history-row">
                          <span className="history-amount">{formatCurrency(e.amount)}</span>
                          <span className="history-date">{formatDate(e.occurredAt)}</span>
                        </div>
                        <p className="history-desc">{e.description || e.merchant || "No description"}</p>
                        <p className="history-cat">{e.category || "Uncategorized"}{e.paymentMethod ? ` — ${e.paymentMethod}` : ""}</p>
                      </li>
                    ))}
                  </ul>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
