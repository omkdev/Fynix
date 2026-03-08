import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api";
import "./Dashboard.css";

const CATEGORIES = [
  "Food", "Rent", "Utilities", "Transport", "Subscription", "Shopping",
  "Health", "Entertainment", "Education", "Other"
];

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [summary, setSummary] = useState({ byCategory: [], total: 0 });

  const [expenseForm, setExpenseForm] = useState({
    amount: "", category: "Food", description: "", type: "daily"
  });
  const [subForm, setSubForm] = useState({
    name: "", amount: "", cycle: "monthly", nextBillingDate: ""
  });

  const currentYear = new Date().getFullYear();

  const totalThisYear = summary.total || 0;
  const monthlyRecurring = subscriptions.reduce((sum, sub) => {
    const amt = Number(sub.amount) || 0;
    return sum + (sub.cycle === "yearly" ? amt / 12 : amt);
  }, 0);

  const upcomingSub = (() => {
    const now = new Date();
    const upcoming = subscriptions
      .filter((s) => s.nextBillingDate)
      .map((s) => {
        const diffDays = Math.ceil(
          (new Date(s.nextBillingDate) - now) / (24 * 60 * 60 * 1000)
        );
        return { ...s, daysLeft: diffDays };
      })
      .filter((s) => s.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0];
    return upcoming || null;
  })();

  useEffect(() => {
    loadExpenses();
    loadSubscriptions();
    loadMonthly();
    loadSummary();
  }, []);

  async function loadExpenses() {
    try {
      const { data } = await api.get("/api/expenses");
      setExpenses(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSubscriptions() {
    try {
      const { data } = await api.get("/api/subscriptions");
      setSubscriptions(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadMonthly() {
    try {
      const { data } = await api.get("/api/expenses/monthly", { params: { year: currentYear } });
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      setMonthlyData(
        data.map((d) => ({ month: monthNames[d._id.month - 1], total: d.total }))
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSummary() {
    try {
      const start = new Date(currentYear, 0, 1).toISOString().slice(0, 10);
      const end = new Date().toISOString().slice(0, 10);
      const { data } = await api.get("/api/expenses/summary", { params: { from: start, to: end } });
      setSummary(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!expenseForm.amount) return;
    try {
      await api.post("/api/expenses", expenseForm);
      setExpenseForm({ amount: "", category: "Food", description: "", type: "daily" });
      loadExpenses();
      loadMonthly();
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add expense");
    }
  }

  async function handleAddSub(e) {
    e.preventDefault();
    if (!subForm.name || !subForm.amount || !subForm.nextBillingDate) return;
    try {
      await api.post("/api/subscriptions", subForm);
      setSubForm({ name: "", amount: "", cycle: "monthly", nextBillingDate: "" });
      loadSubscriptions();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add subscription");
    }
  }

  async function deleteExpense(id) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      loadExpenses();
      loadMonthly();
      loadSummary();
    } catch (e) {
      alert("Failed to delete");
    }
  }

  async function deleteSub(id) {
    if (!window.confirm("Delete this subscription?")) return;
    try {
      await api.delete(`/api/subscriptions/${id}`);
      loadSubscriptions();
    } catch (e) {
      alert("Failed to delete");
    }
  }

  return (
    <div className="dashboard">
      <section className="dashboard-section dashboard-insights">
        <div className="insights-grid">
          <div className="insight-card">
            <p className="insight-label">Total spent this year</p>
            <p className="insight-value">₹{totalThisYear.toLocaleString()}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Monthly recurring</p>
            <p className="insight-value">
              ₹{Math.round(monthlyRecurring).toLocaleString()} <span className="insight-pill">/ month</span>
            </p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Next subscription</p>
            {upcomingSub ? (
              <p className="insight-value insight-next">
                {upcomingSub.name}{" "}
                <span className="insight-subtext">
                  in {upcomingSub.daysLeft} day{upcomingSub.daysLeft === 1 ? "" : "s"}
                </span>
              </p>
            ) : (
              <p className="insight-empty">No upcoming renewals</p>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Add expense</h2>
        <form onSubmit={handleAddExpense} className="dashboard-form">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <select
            value={expenseForm.category}
            onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
          />
          <select
            value={expenseForm.type}
            onChange={(e) => setExpenseForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
          <button type="submit">Add</button>
        </form>
      </section>

      <section className="dashboard-section">
        <h2>Monthly report {currentYear}</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151" }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="summary-total">Total this year: ₹{summary.total.toLocaleString()}</p>
      </section>

      <section className="dashboard-section">
        <h2>By category</h2>
        <ul className="category-list">
          {summary.byCategory.slice(0, 8).map((s) => (
            <li key={s._id}>
              <span>{s._id}</span>
              <span>₹{s.total.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-section">
        <h2>Recent expenses</h2>
        <ul className="expense-list">
          {expenses.slice(0, 15).map((ex) => (
            <li key={ex._id}>
              <span className="ex-date">{new Date(ex.date).toLocaleDateString()}</span>
              <span className="ex-cat">{ex.category}</span>
              <span className="ex-amt">₹{Number(ex.amount).toLocaleString()}</span>
              <button type="button" className="btn-delete" onClick={() => deleteExpense(ex._id)}>×</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-section">
        <h2>Add subscription</h2>
        <form onSubmit={handleAddSub} className="dashboard-form">
          <input
            type="text"
            placeholder="Name (e.g. Netflix)"
            value={subForm.name}
            onChange={(e) => setSubForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={subForm.amount}
            onChange={(e) => setSubForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <select
            value={subForm.cycle}
            onChange={(e) => setSubForm((f) => ({ ...f, cycle: e.target.value }))}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input
            type="date"
            placeholder="Next billing date"
            value={subForm.nextBillingDate}
            onChange={(e) => setSubForm((f) => ({ ...f, nextBillingDate: e.target.value }))}
            required
          />
          <button type="submit">Add</button>
        </form>
      </section>

      <section className="dashboard-section">
        <h2>Subscriptions</h2>
        <ul className="sub-list">
          {subscriptions.map((s) => (
            <li key={s._id}>
              <span className="sub-name">{s.name}</span>
              <span className="sub-amt">₹{Number(s.amount).toLocaleString()}/{s.cycle}</span>
              <span className="sub-date">Next: {new Date(s.nextBillingDate).toLocaleDateString()}</span>
              <button type="button" className="btn-delete" onClick={() => deleteSub(s._id)}>×</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
