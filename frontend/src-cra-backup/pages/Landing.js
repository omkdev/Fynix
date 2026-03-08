import { useEffect, useRef, useState } from "react";

// Mock hooks for standalone preview
const useAuth = () => ({ user: null });
const Link = ({ to, className, children }) => <a href={to} className={className}>{children}</a>;
const useNavigate = () => (path) => console.log("Navigate to:", path);

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const navRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDark, setIsDark] = useState(true);

  function toggleTheme() {
    setIsDark(prev => !prev);
  }

  // Sync body bg with theme (matches landing for zero gap with browser chrome)
  useEffect(() => {
    if (isDark) {
      document.body.style.background = "#07090f";
    } else {
      document.body.style.background = "linear-gradient(160deg, #f0f4ff 0%, #f7f9fc 40%, #eef3f8 100%)";
    }
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, [isDark]);

  function handleGetStarted() {
    navigate(user ? "/dashboard" : "/register");
  }

  useEffect(() => {
    // Load GSAP
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
    script.onload = () => {
      const scrollScript = document.createElement("script");
      scrollScript.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js";
      scrollScript.onload = initAnimations;
      document.head.appendChild(scrollScript);
    };
    document.head.appendChild(script);

    function initAnimations() {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      // Hero animations
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".hero-tag", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 })
        .fromTo(".hero-title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8 }, "-=0.3")
        .fromTo(".hero-subtitle", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.4")
        .fromTo(".hero-ctas", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.3")
        .fromTo(".hero-footnote", { opacity: 0 }, { opacity: 1, duration: 0.5 }, "-=0.2")
        .fromTo(".hero-orb", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, stagger: 0.2, ease: "power2.out" }, 0)
        .fromTo(".stat-item", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, "-=0.3");

      // Cards scroll animation
      gsap.fromTo(".feature-card", {
        opacity: 0, y: 60, scale: 0.95
      }, {
        opacity: 1, y: 0, scale: 1,
        duration: 0.7,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".features-section",
          start: "top 75%",
        }
      });

      // Section headers
      gsap.utils.toArray(".section-header").forEach(el => {
        gsap.fromTo(el, { opacity: 0, y: 30 }, {
          opacity: 1, y: 0, duration: 0.7,
          scrollTrigger: { trigger: el, start: "top 80%" }
        });
      });

      // Steps
      gsap.fromTo(".step-item", {
        opacity: 0, x: -40
      }, {
        opacity: 1, x: 0,
        duration: 0.6,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: { trigger: ".steps-section", start: "top 75%" }
      });

      // CTA section
      gsap.fromTo(".cta-section", {
        opacity: 0, y: 40
      }, {
        opacity: 1, y: 0,
        duration: 0.8,
        scrollTrigger: { trigger: ".cta-section", start: "top 80%" }
      });

      // Floating orbs
      gsap.to(".orb-1", { y: -30, x: 15, duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".orb-2", { y: 25, x: -20, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1 });
      gsap.to(".orb-3", { y: -20, x: 10, duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2 });
    }

    // Scroll handler for navbar
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    // Mouse parallax
    const handleMouse = (e) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMouse);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <div className={`landing-root ${!isDark ? "theme-light" : ""}`} style={{ color: "var(--text)", minHeight: "100vh", width: "100%", transition: "background 0.5s ease, color 0.5s ease", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        .landing-root { background: var(--bg); }

        .theme-light {
          --bg: #f0f4ff;
          --surface: #ffffff;
          --surface2: #eef1f8;
          --border: rgba(0,0,0,0.08);
          --border-hover: rgba(0,0,0,0.16);
          --text: #0f1117;
          --muted: #64748b;
          --accent: #16a35a;
          --accent2: #3b6fe0;
          --accent3: #7c3aed;
          --glow: rgba(22,163,90,0.1);
          --glow2: rgba(59,111,224,0.08);
        }
        .theme-light { background: linear-gradient(160deg, #f0f4ff 0%, #f7f9fc 40%, #eef3f8 100%); color: var(--text); }
        .theme-light .hero-title { color: #0f1117; }
        .theme-light .grid-overlay { background-image: linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px); }
        .theme-light .orb-1 { background: radial-gradient(circle, rgba(22,163,90,0.15) 0%, transparent 70%); }
        .theme-light .orb-2 { background: radial-gradient(circle, rgba(59,111,224,0.12) 0%, transparent 70%); }
        .theme-light .orb-3 { background: radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%); }
        .theme-light .navbar-inner { background: rgba(255,255,255,0.75); border-color: rgba(0,0,0,0.1); box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .theme-light .nav-logo { color: #0f1117; }
        .theme-light .nav-link { color: #64748b; }
        .theme-light .nav-link:hover { color: #0f1117; background: rgba(0,0,0,0.04); }
        .theme-light .stat-value { color: #0f1117; }
        .theme-light .stats-bar { border-top-color: rgba(0,0,0,0.08); }
        .theme-light .section-title { color: #0f1117; }
        .theme-light .feature-card { background: #ffffff; border-color: rgba(0,0,0,0.08); box-shadow: 0 2px 16px rgba(0,0,0,0.05); }
        .theme-light .feature-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.1); border-color: rgba(0,0,0,0.14); }
        .theme-light .feature-title { color: #0f1117; }
        .theme-light .step-number { background: #eef1f8; border-color: rgba(0,0,0,0.1); }
        .theme-light .step-content h4 { color: #0f1117; }
        .theme-light .steps-visual { background: #ffffff; border-color: rgba(0,0,0,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .theme-light .visual-card { background: #f4f6fb; border-color: rgba(0,0,0,0.08); }
        .theme-light .visual-title { color: #0f1117; }
        .theme-light .visual-amount { color: #0f1117; }
        .theme-light .cta-inner { background: #ffffff; border-color: rgba(0,0,0,0.08); box-shadow: 0 8px 40px rgba(0,0,0,0.08); }
        .theme-light .cta-title { color: #0f1117; }
        .theme-light .footer { background: transparent; border-top: none; }
        .theme-light .footer-logo { color: #0f1117; }
        .theme-light .social-btn { border-color: rgba(0,0,0,0.1); color: #64748b; }
        .theme-light .social-btn:hover { color: #0f1117; background: rgba(0,0,0,0.04); }
        .theme-light .footer-copy { color: #94a3b8; }
        .theme-light .footer-bottom-links a { color: #94a3b8; }
        .theme-light .cta-ghost:hover { background: rgba(0,0,0,0.04); }
        .theme-light .nav-cta { color: #fff; }
        .theme-light .steps-section { background: transparent; }

        /* Navbar theme toggle */
        .theme-toggle-nav {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border-hover);
          background: rgba(255,255,255,0.04);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .theme-toggle-nav:hover {
          background: rgba(255,255,255,0.08);
          border-color: var(--accent);
          transform: rotate(20deg);
        }
        .theme-toggle-nav .toggle-icon { font-size: 1rem; }

        /* Theme toggle button (kept for reference, not used) */
        .theme-toggle {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 200;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 1px solid var(--border-hover);
          background: var(--surface);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          overflow: hidden;
        }
        .theme-toggle:hover { transform: scale(1.12) rotate(20deg); box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 20px var(--glow); border-color: var(--accent); }
        .theme-toggle:active { transform: scale(0.93); }
        .toggle-icon { position: absolute; font-size: 1.25rem; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); line-height: 1; }
        .icon-moon { opacity: 1; transform: translateY(0) rotate(0deg); }
        .icon-sun  { opacity: 0; transform: translateY(22px) rotate(90deg); }
        .theme-light .icon-moon { opacity: 0; transform: translateY(-22px) rotate(-90deg); }
        .theme-light .icon-sun  { opacity: 1; transform: translateY(0) rotate(0deg); }
        .toggle-glow { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle, var(--accent) 0%, transparent 70%); opacity: 0; transition: opacity 0.3s ease; }
        .theme-toggle:hover .toggle-glow { opacity: 0.15; }

        :root {
          --bg: #07090f;
          --surface: #0d1117;
          --surface2: #131929;
          --border: rgba(255,255,255,0.07);
          --border-hover: rgba(255,255,255,0.15);
          --text: #e8eaf0;
          --muted: #6b7280;
          --accent: #3dd68c;
          --accent2: #5b8af0;
          --accent3: #a78bfa;
          --glow: rgba(61,214,140,0.15);
          --glow2: rgba(91,138,240,0.12);
        }

        html, body { margin: 0; padding: 0; width: 100%; scroll-behavior: smooth; }
        #root, #app { background: var(--bg); margin: 0; padding: 0; }

        body {
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--text);
          overflow-x: hidden;
          line-height: 1.6;
        }

        /* ── NAVBAR ── */
        .navbar {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
          width: min(760px, calc(100vw - 40px));
        }

        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-radius: 100px;
          border: 1px solid var(--border);
          background: rgba(13,17,23,0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: all 0.4s ease;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .navbar.scrolled .navbar-inner {
          background: rgba(13,17,23,0.85);
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .nav-logo {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: -0.02em;
          color: var(--text);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-logo-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nav-link {
          color: var(--muted);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 100px;
          transition: all 0.2s ease;
        }

        .nav-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }

        .nav-cta {
          background: var(--accent);
          color: #07090f;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 100px;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          text-decoration: none;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 0 20px rgba(61,214,140,0.25);
        }

        .nav-cta:hover {
          background: #4ee89e;
          box-shadow: 0 0 30px rgba(61,214,140,0.4);
          transform: translateY(-1px);
        }

        /* ── HERO ── */
        .hero-section {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 140px 24px 100px;
          position: relative;
          overflow: hidden;
          background: transparent;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .hero-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0;
        }

        .orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(61,214,140,0.18) 0%, transparent 70%);
          top: -100px;
          right: -100px;
        }

        .orb-2 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(91,138,240,0.15) 0%, transparent 70%);
          bottom: -150px;
          left: -150px;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%);
          top: 40%;
          left: 50%;
          transform: translateX(-50%);
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 80%);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 780px;
        }

        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
          background: rgba(61,214,140,0.08);
          border: 1px solid rgba(61,214,140,0.2);
          padding: 6px 16px;
          border-radius: 100px;
          margin-bottom: 28px;
          opacity: 0;
        }

        .hero-tag-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(61,214,140,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(61,214,140,0); }
        }

        .hero-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(3.5rem, 8vw, 7rem);
          font-weight: 800;
          line-height: 1.0;
          letter-spacing: -0.04em;
          color: #fff;
          margin-bottom: 32px;
          opacity: 0;
        }

        .hero-title .highlight {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          color: var(--muted);
          max-width: 560px;
          margin: 0 auto 44px;
          line-height: 1.75;
          font-weight: 400;
          letter-spacing: -0.01em;
          opacity: 0;
        }

        .hero-ctas {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          opacity: 0;
        }

        .cta-primary {
          background: var(--accent);
          color: #07090f;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 16px 34px;
          border-radius: 100px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
          font-size: 1rem;
          box-shadow: 0 0 30px rgba(61,214,140,0.3);
        }

        .cta-primary:hover {
          background: #4ee89e;
          transform: translateY(-2px);
          box-shadow: 0 0 50px rgba(61,214,140,0.5);
        }

        .cta-primary svg { transition: transform 0.2s ease; }
        .cta-primary:hover svg { transform: translateX(3px); }

        .cta-ghost {
          background: transparent;
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          padding: 14px 28px;
          border-radius: 100px;
          border: 1px solid var(--border-hover);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.25s ease;
        }

        .cta-ghost:hover {
          border-color: rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.04);
        }

        .hero-footnote {
          font-size: 0.8rem;
          color: rgba(107,114,128,0.7);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .hero-footnote::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.6;
        }

        /* Stats bar */
        .stats-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          margin-top: 64px;
          padding-top: 40px;
          flex-wrap: wrap;
        }

        .stat-item {
          text-align: center;
          opacity: 0;
        }

        .stat-value {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.04em;
        }

        .stat-value span { color: var(--accent); }

        .stat-label {
          font-size: 0.78rem;
          color: var(--muted);
          margin-top: 2px;
          letter-spacing: 0.04em;
        }

        .stat-divider {
          width: 1px;
          height: 32px;
          background: var(--border);
        }

        /* ── SECTIONS ── */
        .section {
          padding: 100px 24px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .section-header {
          margin-bottom: 56px;
        }

        .section-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent2);
          margin-bottom: 12px;
        }

        .section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(2.2rem, 4vw, 3.2rem);
          font-weight: 800;
          letter-spacing: -0.035em;
          color: #fff;
          line-height: 1.1;
        }

        .section-desc {
          color: var(--muted);
          margin-top: 16px;
          font-size: 1.1rem;
          max-width: 500px;
          line-height: 1.75;
          letter-spacing: -0.01em;
        }

        /* ── FEATURES ── */
        .features-section { padding: 100px 24px; width: 100%; background: transparent; }
        .features-inner { max-width: 1100px; margin: 0 auto; }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 56px;
        }

        .feature-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 40px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          opacity: 0;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--card-glow, transparent) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .feature-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .feature-card:hover::before { opacity: 1; }

        .card-1 { --card-glow: rgba(61,214,140,0.05); }
        .card-2 { --card-glow: rgba(91,138,240,0.05); }
        .card-3 { --card-glow: rgba(167,139,250,0.05); }

        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          margin-bottom: 20px;
        }

        .icon-green { background: rgba(61,214,140,0.12); }
        .icon-blue { background: rgba(91,138,240,0.12); }
        .icon-purple { background: rgba(167,139,250,0.12); }

        .feature-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .feature-desc {
          color: var(--muted);
          font-size: 0.95rem;
          line-height: 1.75;
          letter-spacing: -0.005em;
        }

        .feature-tag {
          display: inline-block;
          margin-top: 16px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 100px;
        }

        .tag-green { color: var(--accent); background: rgba(61,214,140,0.1); }
        .tag-blue { color: var(--accent2); background: rgba(91,138,240,0.1); }
        .tag-purple { color: var(--accent3); background: rgba(167,139,250,0.1); }

        /* ── HOW IT WORKS ── */
        .steps-section {
          padding: 120px 24px;
          width: 100%;
          background: transparent;
        }

        .steps-inner { max-width: 1100px; margin: 0 auto; }

        .steps-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          margin-top: 56px;
        }

        @media (max-width: 768px) {
          .steps-layout { grid-template-columns: 1fr; gap: 40px; }
          .steps-visual { display: none; }
          .nav-links { display: none; }
        }

        .step-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          padding: 24px;
          border-radius: 16px;
          transition: all 0.3s ease;
          opacity: 0;
          cursor: default;
        }

        .step-item:hover {
          background: rgba(255,255,255,0.03);
        }

        .step-number {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 50%;
          background: var(--surface2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--accent);
          transition: all 0.3s ease;
        }

        .step-item:hover .step-number {
          background: rgba(61,214,140,0.1);
          border-color: rgba(61,214,140,0.3);
          box-shadow: 0 0 20px rgba(61,214,140,0.15);
        }

        .step-content h4 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .step-content p {
          color: var(--muted);
          font-size: 0.95rem;
          line-height: 1.7;
          letter-spacing: -0.005em;
        }

        .steps-visual {
          position: relative;
          height: 360px;
          border-radius: 24px;
          background: var(--surface);
          border: 1px solid var(--border);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .visual-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          width: 260px;
        }

        .visual-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .visual-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 0.8rem; font-weight: 700; color: #fff; }
        .visual-badge {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--accent);
          background: rgba(61,214,140,0.1);
          padding: 3px 8px;
          border-radius: 100px;
        }

        .visual-amount {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.04em;
          margin-bottom: 4px;
        }

        .visual-sub { font-size: 0.75rem; color: var(--muted); margin-bottom: 16px; }

        .visual-bar-track {
          height: 4px;
          background: var(--border);
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .visual-bar-fill {
          height: 100%;
          border-radius: 100px;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          animation: barPulse 3s ease-in-out infinite;
        }

        @keyframes barPulse {
          0%, 100% { width: 65%; }
          50% { width: 72%; }
        }

        .visual-rows { display: flex; flex-direction: column; gap: 8px; }

        .visual-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
        }

        .visual-row-left { display: flex; align-items: center; gap: 8px; color: var(--muted); }

        .visual-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .visual-row-right { color: var(--text); font-weight: 500; }

        /* ── CTA SECTION ── */
        .cta-section {
          padding: 80px 24px;
          width: 100%;
          opacity: 0;
          background: transparent;
        }

        .cta-inner {
          max-width: 700px;
          margin: 0 auto;
          text-align: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 64px 48px;
          position: relative;
          overflow: hidden;
        }

        .cta-inner::before {
          content: '';
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 300px;
          background: radial-gradient(circle, rgba(61,214,140,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .cta-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(2rem, 4.5vw, 3rem);
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.04em;
          line-height: 1.1;
          margin-bottom: 20px;
          position: relative;
        }

        .cta-desc {
          color: var(--muted);
          font-size: 1.1rem;
          margin-bottom: 36px;
          line-height: 1.75;
          letter-spacing: -0.01em;
          position: relative;
        }

        .cta-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
        }

        /* ── FOOTER ── */
        .footer {
          padding: 60px 24px 32px;
          background: transparent;
        }

        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
        }

        .footer-top {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          padding-bottom: 48px;
          border-bottom: 1px solid var(--border);
        }

        @media (max-width: 768px) {
          .footer-top { grid-template-columns: 1fr 1fr; gap: 32px; }
        }

        .footer-brand {}

        .footer-logo {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.3rem;
          font-weight: 800;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          text-decoration: none;
        }

        .footer-tagline {
          color: var(--muted);
          font-size: 0.875rem;
          line-height: 1.6;
          max-width: 260px;
          margin-bottom: 20px;
        }

        .footer-socials {
          display: flex;
          gap: 10px;
        }

        .social-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
          font-size: 0.9rem;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .social-btn:hover {
          border-color: var(--border-hover);
          background: rgba(255,255,255,0.04);
          color: var(--text);
        }

        .footer-col h5 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          margin-bottom: 16px;
        }

        .footer-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
          list-style: none;
        }

        .footer-links a {
          color: var(--muted);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s ease;
        }

        .footer-links a:hover { color: var(--text); }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 28px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .footer-copy {
          color: rgba(107,114,128,0.6);
          font-size: 0.8rem;
        }

        .footer-copy span { color: var(--accent); }

        .footer-bottom-links {
          display: flex;
          gap: 20px;
        }

        .footer-bottom-links a {
          color: rgba(107,114,128,0.6);
          text-decoration: none;
          font-size: 0.8rem;
          transition: color 0.2s ease;
        }

        .footer-bottom-links a:hover { color: var(--muted); }
      `}</style>

      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`} ref={navRef}>
        <div className="navbar-inner">
          <a href="/" className="nav-logo">
            <span className="nav-logo-dot" />
            Fynix
          </a>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="/login" className="nav-link">Log in</a>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <button
              className="theme-toggle-nav"
              onClick={toggleTheme}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              <span className="toggle-icon icon-moon">🌙</span>
              <span className="toggle-icon icon-sun">☀️</span>
            </button>
            <button className="nav-cta" onClick={handleGetStarted}>Get started →</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section" id="hero">
        <div className="hero-bg">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-orb orb-3" />
          <div className="grid-overlay" />
        </div>

        <div className="hero-content">
          <div className="hero-tag">
            <span className="hero-tag-pulse" />
            Smart expense &amp; subscription tracker
          </div>

          <h1 className="hero-title">
            See where your<br />
            money <span className="highlight">actually goes.</span>
          </h1>

          <p className="hero-subtitle">
            Fynix keeps your daily spending and recurring subscriptions in one clean
            dashboard, so you never get surprised by a renewal again.
          </p>

          <div className="hero-ctas">
            <button className="cta-primary" onClick={handleGetStarted}>
              Get started free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {user ? (
              <Link to="/dashboard" className="cta-ghost">Go to dashboard</Link>
            ) : (
              <Link to="/login" className="cta-ghost">Log in</Link>
            )}
          </div>

          <p className="hero-footnote">No credit card. Just your email and a password.</p>

          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-value">12<span>k+</span></div>
              <div className="stat-label">Active users</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value">$2<span>M+</span></div>
              <div className="stat-label">Expenses tracked</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value">98<span>%</span></div>
              <div className="stat-label">Satisfaction rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="features-inner">
          <div className="section-header">
            <div className="section-badge">Why Fynix</div>
            <h2 className="section-title">Everything you need to<br />own your finances.</h2>
            <p className="section-desc">Built for people who want clarity, not complexity.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card card-1">
              <div className="feature-icon icon-green">💸</div>
              <h3 className="feature-title">Track everything in one place</h3>
              <p className="feature-desc">
                Daily coffees, rent, streaming, SaaS tools — capture both one-off
                expenses and recurring subscriptions in seconds.
              </p>
              <span className="feature-tag tag-green">Expenses & subs</span>
            </div>

            <div className="feature-card card-2">
              <div className="feature-icon icon-blue">📊</div>
              <h3 className="feature-title">Understand your real burn</h3>
              <p className="feature-desc">
                See monthly totals, category breakdowns, and how much you've
                already committed to in subscriptions.
              </p>
              <span className="feature-tag tag-blue">Analytics</span>
            </div>

            <div className="feature-card card-3">
              <div className="feature-icon icon-purple">🔔</div>
              <h3 className="feature-title">Never miss a renewal</h3>
              <p className="feature-desc">
                Fynix highlights upcoming renewals so you can cancel, downgrade, or
                budget before money leaves your account.
              </p>
              <span className="feature-tag tag-purple">Renewal alerts</span>
            </div>
          </div>
        </div>
      </section>


      {/* HOW IT WORKS */}
      <section className="steps-section" id="how-it-works">
        <div className="steps-inner">
          <div className="section-header">
            <div className="section-badge">How it works</div>
            <h2 className="section-title">Up and running<br />in under 2 minutes.</h2>
          </div>

          <div className="steps-layout">
            <div className="steps-list">
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Create your account</h4>
                  <p>Sign up in under a minute with just your email. No credit card needed.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Add expenses &amp; subscriptions</h4>
                  <p>Log a few days of spending and your recurring apps in the dashboard.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Get a clear picture</h4>
                  <p>Fynix shows monthly reports, category insights, and upcoming renewals — so you stay in control.</p>
                </div>
              </div>
            </div>

            <div className="steps-visual">
              <div className="visual-card">
                <div className="visual-header">
                  <span className="visual-title">March Overview</span>
                  <span className="visual-badge">Live</span>
                </div>
                <div className="visual-amount">$1,842</div>
                <div className="visual-sub">65% of monthly budget used</div>
                <div className="visual-bar-track">
                  <div className="visual-bar-fill" />
                </div>
                <div className="visual-rows">
                  {[
                    { color: "#3dd68c", label: "Subscriptions", val: "$247" },
                    { color: "#5b8af0", label: "Food & drink", val: "$680" },
                    { color: "#a78bfa", label: "Utilities", val: "$190" },
                    { color: "#f59e0b", label: "Other", val: "$725" },
                  ].map(r => (
                    <div className="visual-row" key={r.label}>
                      <span className="visual-row-left">
                        <span className="visual-dot" style={{ background: r.color }} />
                        {r.label}
                      </span>
                      <span className="visual-row-right">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to take control<br />of your money?</h2>
          <p className="cta-desc">
            Join thousands who use Fynix to stay on top of every dollar.
            Start for free — no card required.
          </p>
          <div className="cta-buttons">
            <button className="cta-primary" onClick={handleGetStarted}>
              Create free account →
            </button>
            <Link to="/login" className="cta-ghost">Log in</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="/" className="footer-logo">
                <span style={{ width:8,height:8,borderRadius:'50%',background:'var(--accent)',boxShadow:'0 0 10px var(--accent)',display:'inline-block' }} />
                Fynix
              </a>
              <p className="footer-tagline">
                Smart expense &amp; subscription tracker. Know where your money goes, every day.
              </p>
              <div className="footer-socials">
                <a href="#" className="social-btn" title="Twitter">𝕏</a>
                <a href="#" className="social-btn" title="GitHub">⌥</a>
                <a href="#" className="social-btn" title="Discord">◈</a>
              </div>
            </div>

            <div className="footer-col">
              <h5>Product</h5>
              <ul className="footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How it works</a></li>
                <li><a href="/dashboard">Dashboard</a></li>
                <li><a href="#">Changelog</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Company</h5>
              <ul className="footer-links">
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Legal</h5>
              <ul className="footer-links">
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="#">Cookies</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copy">© 2025 <span>Fynix</span>. All rights reserved.</p>
            <div className="footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
}