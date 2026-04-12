import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Landing.css";

const trustPoints = [
  { title: "Privacy-first by design", description: "Your financial data stays focused on product value. No ad targeting or data selling." },
  { title: "Secure session-based login", description: "Short-lived access tokens in memory and a revocable refresh token in an HttpOnly cookie." },
  { title: "No ads, no noise", description: "Fynix is built to improve money habits, not to distract users with promotions." },
];

const features = [
  { title: "Smart expense tracking", description: "Capture expenses quickly and keep your spending history clean and searchable." },
  { title: "Category-based insights", description: "Understand how much you spend across food, travel, subscriptions, and essentials." },
  { title: "AI-driven recommendations", description: "Receive practical, low-effort suggestions to reduce waste and improve budgeting." },
];

const steps = [
  { title: "Connect or add expenses", description: "Start by adding daily transactions and keeping your records organized in one place." },
  { title: "Analyze spending patterns", description: "See category-wise trends and monthly totals to identify where your money goes." },
  { title: "Improve habits with AI guidance", description: "Follow simple recommendations that help you make smarter day-to-day decisions." },
];

export default function Landing() {
  const pageRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);
    let cleanupCardTilt = () => {};

    const context = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.fromTo("[data-hero-badge]", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.45 })
        .fromTo("[data-hero-title]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.65 }, "-=0.15")
        .fromTo("[data-hero-subtitle]", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.35")
        .fromTo("[data-hero-cta]", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08 }, "-=0.3")
        .fromTo("[data-hero-note]", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.25")
        .fromTo("[data-preview-glow]", { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 0.5, scale: 1, duration: 0.45 }, "-=0.85")
        .fromTo("[data-preview-float]", { autoAlpha: 0, y: 20, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 }, "<");

      gsap.to("[data-preview-card]", { boxShadow: "0 12px 30px rgba(15,23,42,0.08)", duration: 3, ease: "sine.inOut", repeat: -1, yoyo: true });

      const previewRegion = pageRef.current?.querySelector("[data-preview-parallax]");
      const previewCard = pageRef.current?.querySelector("[data-preview-card]");
      const previewInner = pageRef.current?.querySelector("[data-preview-tilt-inner]");
      if (previewRegion && previewCard) {
        gsap.set(previewRegion, { perspective: 750 });
        gsap.set(previewCard, { transformStyle: "preserve-3d", transformOrigin: "center center" });
        const rotateXTo = gsap.quickTo(previewCard, "rotationX", { duration: 0.5, ease: "power3.out" });
        const rotateYTo = gsap.quickTo(previewCard, "rotationY", { duration: 0.5, ease: "power3.out" });
        const innerXTo = previewInner ? gsap.quickTo(previewInner, "x", { duration: 0.5, ease: "power3.out" }) : null;
        const innerYTo = previewInner ? gsap.quickTo(previewInner, "y", { duration: 0.5, ease: "power3.out" }) : null;

        const handlePointerMove = (e) => {
          const b = previewRegion.getBoundingClientRect();
          const px = gsap.utils.clamp(0, 1, (e.clientX - b.left) / b.width);
          const py = gsap.utils.clamp(0, 1, (e.clientY - b.top) / b.height);
          rotateXTo(gsap.utils.interpolate(12, -12, py));
          rotateYTo(gsap.utils.interpolate(-12, 12, px));
          innerXTo?.(gsap.utils.interpolate(-16, 16, px));
          innerYTo?.(gsap.utils.interpolate(-16, 16, py));
        };
        const handlePointerLeave = () => { rotateXTo(0); rotateYTo(0); innerXTo?.(0); innerYTo?.(0); };
        previewRegion.addEventListener("pointermove", handlePointerMove);
        previewRegion.addEventListener("pointerleave", handlePointerLeave);
        cleanupCardTilt = () => {
          previewRegion.removeEventListener("pointermove", handlePointerMove);
          previewRegion.removeEventListener("pointerleave", handlePointerLeave);
        };
      }

      gsap.utils.toArray("[data-reveal-group]").forEach((group) => {
        gsap.fromTo(group, { scale: 0.985, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.55, ease: "power2.out", scrollTrigger: { trigger: group, start: "top 86%", once: true } });
        const cards = group.querySelectorAll("[data-reveal-card]");
        gsap.fromTo(cards, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.12, ease: "power2.out", scrollTrigger: { trigger: group, start: "top 84%", once: true } });
      });

      gsap.fromTo("[data-cta-box]", { autoAlpha: 0, y: 24, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: "[data-cta-box]", start: "top 85%", once: true } });

      const formatter = new Intl.NumberFormat("en-IN");
      pageRef.current?.querySelectorAll("[data-count-value]").forEach((el) => {
        const type = el.getAttribute("data-count-type");
        const target = Number(el.getAttribute("data-target") || "0");
        const counter = { value: 0 };
        gsap.to(counter, {
          value: target, duration: type === "currency" ? 4 : 1.25, ease: type === "currency" ? "none" : "power2.out",
          scrollTrigger: { trigger: "[data-preview-float]", start: "top 92%", once: true },
          onUpdate: () => {
            const r = Math.round(counter.value);
            if (type === "currency") el.textContent = `₹${formatter.format(r)}`;
            if (type === "percent") el.textContent = `+${r}%`;
          },
        });
      });
    }, pageRef);

    return () => { cleanupCardTilt(); context.revert(); };
  }, []);

  return (
    <main ref={pageRef} className="landing-page">
      <section className="hero-section">
        <div className="hero-grid">
          <header data-hero-copy>
            <div data-hero-badge className="hero-badge">
              <span className="fynix-logo-text">🛡 Fynix</span>
            </div>
            <h1 data-hero-title className="hero-title">
              Bas spend karo, baaki <span className="hero-accent">Fynix</span> dekh lega.
            </h1>
            <p data-hero-subtitle className="hero-subtitle">
              Fynix helps everyday users track spending with clarity, uncover category-level insights,
              and make better financial decisions through simple, practical guidance.
            </p>
            <div className="hero-cta-row">
              <Link to="/register" data-hero-cta className="btn-primary">Get Started</Link>
              <a href="#how-it-works" data-hero-cta className="btn-link">See how it works</a>
            </div>
            <p data-hero-note className="hero-note">
              Already have an account? <Link to="/login" className="inline-link">Sign in</Link>
            </p>
          </header>

          <div className="preview-region" data-preview-parallax>
            <div data-preview-glow className="preview-glow" />
            <div data-preview-float>
              <div role="img" aria-label="Fynix dashboard preview" data-preview-card className="preview-card">
                <div className="preview-inner" data-preview-tilt-inner>
                  <div className="preview-bar" />
                  <div className="preview-metrics">
                    <div className="metric-box">
                      <p className="metric-label">Monthly spend</p>
                      <p className="metric-value">
                        <span data-count-value data-count-type="currency" data-target="18450">₹18,450</span>
                      </p>
                    </div>
                    <div className="metric-box">
                      <p className="metric-label">Savings trend</p>
                      <p className="metric-value green">
                        <span data-count-value data-count-type="percent" data-target="12">+12%</span>
                      </p>
                    </div>
                  </div>
                  <div className="preview-top-cat">
                    <p className="metric-label">Top category</p>
                    <p className="top-cat-value">Food and groceries</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cards-section" data-reveal-group>
        <div className="cards-grid">
          {trustPoints.map((p) => (
            <article key={p.title} data-reveal-card className="card">
              <h2 className="card-title">{p.title}</h2>
              <p className="card-desc">{p.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cards-section" data-reveal-group>
        <h2 className="section-title">Core features</h2>
        <p className="section-sub">Everything you need to build consistent financial awareness.</p>
        <div className="cards-grid mt-6">
          {features.map((f) => (
            <article key={f.title} data-reveal-card className="card">
              <h3 className="card-title">{f.title}</h3>
              <p className="card-desc">{f.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cards-section" data-reveal-group>
        <h2 id="how-it-works" className="section-title">How it works</h2>
        <p className="section-sub">A simple three-step flow built for non-technical users.</p>
        <div className="cards-grid mt-6">
          {steps.map((s, i) => (
            <article key={s.title} data-reveal-card className="card">
              <p className="step-label">Step {i + 1}</p>
              <h3 className="card-title">{s.title}</h3>
              <p className="card-desc">{s.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cards-section">
        <div data-cta-box className="cta-box">
          <h2 className="cta-title">Start tracking smarter with Fynix</h2>
          <p className="cta-sub">Build clarity in your finances with a calm, secure, and modern workflow.</p>
          <Link to="/register" className="btn-primary mt-5">Tap to get started</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-inner">
          <p className="footer-brand">Fynix</p>
          <nav className="footer-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}