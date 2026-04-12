import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  async function handleLogin(e) {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    setIsLoading(true);
    try {
      await login(email, password);
      setStatus({ type: "success", message: "Login successful. Redirecting..." });
      navigate("/dashboard");
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-brand">Fynix</Link>
          <h1 className="auth-title">Login</h1>
          <p className="auth-sub">Sign in to your account to continue.</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" placeholder="you@example.com" className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" placeholder="Your password" className="form-input" />
          </div>
          <button type="submit" disabled={isLoading} className="btn-submit">
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {status.message && (
          <div className={`auth-status ${status.type}`}>{status.message}</div>
        )}

        <p className="auth-footer-text">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">Create account</Link>
        </p>
      </div>
    </main>
  );
}
