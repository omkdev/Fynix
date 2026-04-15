import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Landing.css";

const IconNavLogo = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="#060810" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 2v4M4 6h8M5 10h6M6 14h4" />
  </svg>
);

const IconArrowUp = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 1v14M3 6l5-5 5 5" />
  </svg>
);

const IconInfo = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }} aria-hidden>
    <circle cx="8" cy="8" r="7" />
    <path d="M6.5 6C6.5 5.17 7.17 4.5 8 4.5s1.5.67 1.5 1.5c0 1-1.5 1.5-1.5 2.5M8 12v.5" />
  </svg>
);

const IconArrowRight = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }} aria-hidden>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export default function Landing() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return undefined;
    }

    gsap.registerPlugin(ScrollTrigger);

    let cleanupTilt = () => {};

    const ctx = gsap.context(() => {
      const ease = "power2.out";

      const heroTl = gsap.timeline({ defaults: { ease } });
      heroTl
        .from(".fl-hero-left .fl-hero-badge", { autoAlpha: 0, y: 16, duration: 0.45 })
        .from(".fl-hero-left h1", { autoAlpha: 0, y: 22, duration: 0.62 }, "-=0.2")
        .from(".fl-hero-left .fl-hero-sub", { autoAlpha: 0, y: 16, duration: 0.5 }, "-=0.38")
        .from(".fl-hero-left .fl-hero-actions > *", { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.08 }, "-=0.28")
        .from(".fl-hero-left .fl-hero-signin", { autoAlpha: 0, y: 8, duration: 0.35 }, "-=0.22")
        .from(".fl-floating-tag-ai", { autoAlpha: 0, x: 18, y: -10, duration: 0.45 }, "-=0.55")
        .from(".fl-floating-tag-save", { autoAlpha: 0, x: -18, y: 10, duration: 0.45 }, "<0.12")
        .from(".fl-stat-card", { autoAlpha: 0, y: 30, scale: 0.97, duration: 0.58 }, "-=0.42");

      gsap.to(".fl-stat-card", {
        boxShadow: "0 28px 56px rgba(0, 230, 190, 0.14)",
        duration: 2.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      const tiltRegion = root.querySelector("[data-fl-tilt-region]");
      const tiltCard = root.querySelector("[data-fl-tilt-card]");
      if (tiltRegion && tiltCard) {
        gsap.set(tiltRegion, { perspective: 900 });
        gsap.set(tiltCard, { transformStyle: "preserve-3d", transformOrigin: "center center" });
        const rotateXTo = gsap.quickTo(tiltCard, "rotationX", { duration: 0.45, ease: "power3.out" });
        const rotateYTo = gsap.quickTo(tiltCard, "rotationY", { duration: 0.45, ease: "power3.out" });
        const onMove = (e) => {
          const b = tiltRegion.getBoundingClientRect();
          const px = gsap.utils.clamp(0, 1, (e.clientX - b.left) / b.width);
          const py = gsap.utils.clamp(0, 1, (e.clientY - b.top) / b.height);
          rotateXTo(gsap.utils.interpolate(9, -9, py));
          rotateYTo(gsap.utils.interpolate(-9, 9, px));
        };
        const onLeave = () => {
          rotateXTo(0);
          rotateYTo(0);
        };
        tiltRegion.addEventListener("pointermove", onMove);
        tiltRegion.addEventListener("pointerleave", onLeave);
        cleanupTilt = () => {
          tiltRegion.removeEventListener("pointermove", onMove);
          tiltRegion.removeEventListener("pointerleave", onLeave);
        };
      }

      const countEl = root.querySelector("[data-fl-count]");
      if (countEl) {
        const target = Number(countEl.getAttribute("data-target") || "18450");
        const formatter = new Intl.NumberFormat("en-IN");
        const counter = { v: 0 };
        gsap.to(counter, {
          v: target,
          duration: 2.2,
          ease: "power2.out",
          delay: 0.35,
          onUpdate: () => {
            countEl.textContent = `₹${formatter.format(Math.round(counter.v))}`;
          },
        });
      }

      gsap.from(".fl-trust-item", {
        autoAlpha: 0,
        y: 14,
        duration: 0.52,
        stagger: 0.07,
        ease,
        scrollTrigger: { trigger: ".fl-trust-strip", start: "top 88%", once: true },
      });

      const sections = root.querySelectorAll(".fl-section");
      sections.forEach((sec) => {
        const headerEls = sec.querySelectorAll(".fl-section-tag, h2, .fl-section-sub");
        if (headerEls.length) {
          gsap.from(headerEls, {
            autoAlpha: 0,
            y: 22,
            stagger: 0.08,
            duration: 0.55,
            ease,
            scrollTrigger: { trigger: sec, start: "top 80%", once: true },
          });
        }
      });

      const pillarSec = sections[0];
      if (pillarSec) {
        gsap.from(pillarSec.querySelectorAll(".fl-pillar"), {
          autoAlpha: 0,
          y: 26,
          stagger: 0.12,
          duration: 0.55,
          ease,
          scrollTrigger: { trigger: pillarSec, start: "top 76%", once: true },
        });
      }

      const featSec = sections[1];
      if (featSec) {
        const featTrigger = featSec.querySelector(".fl-features-bento") || featSec;
        gsap.from(featSec.querySelectorAll(".fl-feat-card"), {
          autoAlpha: 0,
          y: 28,
          stagger: 0.12,
          duration: 0.55,
          ease,
          scrollTrigger: { trigger: featTrigger, start: "top 82%", once: true },
        });
      }

      const howSec = sections[2];
      if (howSec) {
        const stepTrigger = howSec.querySelector(".fl-steps-container") || howSec;
        gsap.from(howSec.querySelectorAll(".fl-step"), {
          autoAlpha: 0,
          y: 24,
          stagger: 0.14,
          duration: 0.55,
          ease,
          scrollTrigger: { trigger: stepTrigger, start: "top 82%", once: true },
        });
      }

      gsap.from(".fl-cta-box > *", {
        autoAlpha: 0,
        y: 18,
        stagger: 0.1,
        duration: 0.5,
        ease,
        scrollTrigger: { trigger: ".fl-cta-box", start: "top 86%", once: true },
      });
    }, root);

    return () => {
      cleanupTilt();
      ctx.revert();
    };
  }, []);

  return (
    <main ref={rootRef} className="fynix-landing">
      <nav className="fl-nav" aria-label="Main">
        <div className="fl-nav-pill">
          <Link to="/" className="fl-nav-brand">
            Fynix
          </Link>
          <span className="fl-nav-spacer" aria-hidden />
          <div className="fl-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
          </div>
          <Link to="/register" className="fl-nav-cta">
            Get started
            <IconArrowRight />
          </Link>
        </div>
      </nav>

      <div className="fl-hero-wrap">
        <div className="fl-orb fl-orb-1" aria-hidden />
        <div className="fl-orb fl-orb-2" aria-hidden />

        <div className="fl-hero">
          <div className="fl-hero-left">
            <div className="fl-hero-badge">
              <span className="fl-hero-badge-dot" aria-hidden />
              Now with AI spending coach
            </div>

            <h1>
              Bas spend karo,
              <br />
              <span className="fl-accent">Fynix</span> dekh <span className="fl-muted-word">lega.</span>
            </h1>

            <p className="fl-hero-sub">
              Track every rupee with clarity. Fynix uncovers where your money actually goes — and quietly helps you keep
              more of it.
            </p>

            <div className="fl-hero-actions">
              <Link to="/register" className="fl-btn-primary">
                <IconArrowUp />
                Get started — it&apos;s free
              </Link>
              <a href="#how" className="fl-btn-ghost">
                <IconInfo />
                See how it works
              </a>
            </div>

            <p className="fl-hero-signin">
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
            </p>
          </div>

          <div className="fl-hero-right">
            <div className="fl-hero-card-wrap" data-fl-tilt-region>
              <div className="fl-floating-tag fl-floating-tag-ai">
                <span className="fl-dot fl-dot-green" aria-hidden />
                AI insight ready
              </div>
              <div className="fl-floating-tag fl-floating-tag-save">
                <span className="fl-dot fl-dot-yellow" aria-hidden />
                ₹3,200 saved this month
              </div>

              <div className="fl-stat-card" data-fl-tilt-card>
                <div className="fl-stat-card-header">
                  <span className="fl-stat-card-title">Monthly Overview</span>
                  <span className="fl-stat-card-month">April 2026</span>
                </div>

                <div className="fl-stat-total-label">Total spend</div>
                <div className="fl-stat-main-value">
                  <span data-fl-count data-target="18450">
                    ₹18,450
                  </span>
                </div>
                <div className="fl-stat-bar-container">
                  <div className="fl-stat-bar" />
                </div>

                <div className="fl-stat-grid">
                  <div className="fl-stat-mini">
                    <div className="fl-stat-mini-label">vs last month</div>
                    <div className="fl-stat-mini-value fl-positive">−8.2%</div>
                  </div>
                  <div className="fl-stat-mini">
                    <div className="fl-stat-mini-label">Savings trend</div>
                    <div className="fl-stat-mini-value fl-positive">+12%</div>
                  </div>
                </div>

                <div className="fl-stat-category">
                  <div className="fl-stat-category-left">
                    <div className="fl-stat-cat-icon" aria-hidden>
                      🛒
                    </div>
                    <div>
                      <div className="fl-stat-cat-name">Food &amp; Groceries</div>
                      <div className="fl-stat-cat-sub">Top category this month</div>
                    </div>
                  </div>
                  <div className="fl-stat-cat-amount">₹5,120</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fl-trust-strip">
        <div className="fl-trust-item">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M8 1l1.85 3.74L14 5.63l-3 2.92.71 4.13L8 10.5l-3.71 2.18L5 8.55 2 5.63l4.15-.89L8 1z" />
          </svg>
          Privacy-first — your data stays yours
        </div>
        <div className="fl-trust-item">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <rect x="3" y="7" width="10" height="8" rx="1" />
            <path d="M5 7V5a3 3 0 016 0v2" />
          </svg>
          Zero ads, zero data selling
        </div>
        <div className="fl-trust-item">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M8 1L2 4v4c0 3.5 2.67 5.8 6 7 3.33-1.2 6-3.5 6-7V4L8 1z" />
          </svg>
          End-to-end session security
        </div>
        <div className="fl-trust-item">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="8" cy="8" r="7" />
            <path d="M8 4v4l3 3" />
          </svg>
          Real-time sync across devices
        </div>
      </div>

      <section className="fl-section">
        <div className="fl-section-inner">
          <span className="fl-section-tag">Built right</span>
          <h2>
            Engineered for
            <br />
            trust and clarity
          </h2>
          <p className="fl-section-sub">
            Everything in Fynix is designed so your financial data stays private, secure, and useful — never sold, never
            spammed.
          </p>

          <div className="fl-pillars-grid">
            <div className="fl-pillar">
              <div className="fl-pillar-icon">
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Privacy-first by design</h3>
              <p>
                Your financial data stays focused on product value. No ad targeting, no selling insights to third parties
                — ever.
              </p>
            </div>
            <div className="fl-pillar">
              <div className="fl-pillar-icon">
                <svg viewBox="0 0 24 24" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <h3>Secure session-based login</h3>
              <p>
                Short-lived access tokens kept in memory and a revocable refresh token in an HttpOnly cookie. No JWT leaks
                to localStorage.
              </p>
            </div>
            <div className="fl-pillar">
              <div className="fl-pillar-icon">
                <svg viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <h3>No ads, no noise</h3>
              <p>Fynix is built to improve your money habits — not to distract you with promotions or push notifications.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="fl-section fl-section-features" id="features">
        <div className="fl-section-inner">
          <span className="fl-section-tag">Core features</span>
          <h2>
            Everything you need to
            <br />
            know your money
          </h2>
          <p className="fl-section-sub">
            Build consistent financial awareness with tools that work quietly in the background.
          </p>

          <div className="fl-features-bento">
            <div className="fl-feat-card fl-feat-wide">
              <div className="fl-feat-num">01 — Tracking</div>
              <h3>Smart expense tracking</h3>
              <p>Capture expenses quickly and keep your spending history clean, searchable, and categorized automatically.</p>
              <div className="fl-feat-visual" aria-hidden>
                <div className="fl-bar-chart-bar" style={{ height: "40%", background: "rgba(0,230,190,0.2)" }} />
                <div className="fl-bar-chart-bar" style={{ height: "65%", background: "rgba(0,230,190,0.3)" }} />
                <div className="fl-bar-chart-bar" style={{ height: "50%", background: "rgba(0,230,190,0.2)" }} />
                <div className="fl-bar-chart-bar" style={{ height: "80%", background: "var(--fl-teal)" }} />
                <div className="fl-bar-chart-bar" style={{ height: "60%", background: "rgba(0,230,190,0.3)" }} />
                <div className="fl-bar-chart-bar" style={{ height: "45%", background: "rgba(0,230,190,0.2)" }} />
                <div className="fl-bar-chart-bar" style={{ height: "70%", background: "rgba(0,230,190,0.25)" }} />
              </div>
            </div>

            <div className="fl-feat-card">
              <div className="fl-feat-num">02 — Insights</div>
              <h3>Category-based insights</h3>
              <p>Understand exactly how much you spend across food, travel, subscriptions, and essentials every month.</p>
              <div className="fl-insights-row">
                <span className="fl-insight-chip">
                  <span className="fl-chip-dot" style={{ background: "#FF6B6B" }} aria-hidden />
                  Food ₹5.1k
                </span>
                <span className="fl-insight-chip">
                  <span className="fl-chip-dot" style={{ background: "#4ECDC4" }} aria-hidden />
                  Travel ₹3.2k
                </span>
                <span className="fl-insight-chip">
                  <span className="fl-chip-dot" style={{ background: "#A8E6CF" }} aria-hidden />
                  Subscriptions ₹1.8k
                </span>
              </div>
            </div>

            <div className="fl-feat-card">
              <div className="fl-feat-num">03 — AI</div>
              <h3>AI-driven recommendations</h3>
              <p>Practical, low-effort suggestions to reduce waste and improve your budgeting — no jargon, no lectures.</p>
              <div className="fl-ai-snippet">
                <div className="fl-ai-snippet-label">FYNIX AI</div>
                <div className="fl-ai-snippet-text">
                  You spent ₹680 on food delivery this week. Cooking twice more could save ₹1,200/mo.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fl-section" id="how">
        <div className="fl-section-inner">
          <span className="fl-section-tag">How it works</span>
          <h2>
            Three steps to financial
            <br />
            clarity
          </h2>
          <p className="fl-section-sub">A simple flow built for non-technical users. No spreadsheets. No complexity.</p>

          <div className="fl-steps-container">
            <div className="fl-step-connector" aria-hidden />

            <div className="fl-step">
              <div className="fl-step-num">01</div>
              <div className="fl-step-label">Step 1</div>
              <h3>Connect or add expenses</h3>
              <p>Manually log a purchase or connect your account. Fynix parses and categorizes entries in seconds.</p>
            </div>

            <div className="fl-step">
              <div className="fl-step-num">02</div>
              <div className="fl-step-label">Step 2</div>
              <h3>Analyze spending patterns</h3>
              <p>Visual breakdowns show where money is going. Weekly and monthly trends surface automatically.</p>
            </div>

            <div className="fl-step">
              <div className="fl-step-num">03</div>
              <div className="fl-step-label">Step 3</div>
              <h3>Improve with AI guidance</h3>
              <p>Fynix spots inefficiencies and suggests small changes that compound into real savings over time.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="fl-cta-section">
        <div className="fl-cta-box">
          <div className="fl-cta-glow" aria-hidden />
          <span className="fl-section-tag fl-cta-tag">Free to start</span>
          <h2>
            Your money deserves
            <br />
            better visibility.
          </h2>
          <p>Join thousands of users who stopped wondering where their salary went.</p>
          <div className="fl-cta-actions">
            <Link to="/register" className="fl-btn-primary fl-btn-primary-lg">
              Start tracking for free
              <IconArrowRight />
            </Link>
          </div>
        </div>
      </div>

      <footer className="fl-footer">
        <Link to="/" className="fl-footer-brand">
          <div className="fl-footer-brand-icon">
            <IconNavLogo />
          </div>
          Fynix
        </Link>
        <p>© {new Date().getFullYear()} Fynix. Built for clarity, not confusion.</p>
        <div className="fl-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>
    </main>
  );
}
