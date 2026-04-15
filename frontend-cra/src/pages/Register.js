import { useState, useRef, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "../context/AuthContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import "./Auth.css";

export default function Register() {
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const { register, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 28 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        ease: "power2.out",
        onComplete: () => gsap.set(el, { clearProps: "opacity,visibility" }),
      }
    );
    return undefined;
  }, []);

  async function handleRegister(e) {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    setIsLoading(true);
    try {
      await register(email, password, name);
      setStatus({ type: "success", message: "Account created. Redirecting..." });
      navigate("/dashboard");
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleCredential(credential) {
    setStatus({ type: "", message: "" });
    setIsLoading(true);
    try {
      await signInWithGoogle(credential);
      setStatus({ type: "success", message: "Signed in. Redirecting..." });
      navigate("/dashboard");
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div ref={cardRef} className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-brand">Fynix</Link>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Sign up with email and password to start using Fynix.</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">Full name (optional)</label>
            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
              autoComplete="name" placeholder="Your name" className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" placeholder="you@example.com" className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input id="password" type="password" required minLength={8} value={password}
              onChange={e => setPassword(e.target.value)} autoComplete="new-password"
              placeholder="At least 8 characters" className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password" className="form-label">Confirm password</label>
            <input id="confirm-password" type="password" required minLength={8} value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password"
              placeholder="Re-enter your password" className="form-input" />
          </div>
          <button type="submit" disabled={isLoading} className="btn-submit">
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <span className="auth-divider-line" />
        </div>

        <GoogleSignInButton disabled={isLoading} onCredential={handleGoogleCredential} />

        {status.message && (
          <div className={`auth-status ${status.type}`}>{status.message}</div>
        )}

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
