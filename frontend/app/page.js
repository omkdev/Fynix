'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const trustPoints = [
  {
    title: 'Privacy-first by design',
    description: 'Your financial data stays focused on product value. No ad targeting or data selling.',
  },
  {
    title: 'Secure session-based login',
    description: 'Authentication uses Google or email magic link with secure cookie-based sessions.',
  },
  {
    title: 'No ads, no noise',
    description: 'Fynix is built to improve money habits, not to distract users with promotions.',
  },
];

const features = [
  {
    title: 'Smart expense tracking',
    description: 'Capture expenses quickly and keep your spending history clean and searchable.',
  },
  {
    title: 'Category-based insights',
    description: 'Understand how much you spend across food, travel, subscriptions, and essentials.',
  },
  {
    title: 'AI-driven recommendations',
    description: 'Receive practical, low-effort suggestions to reduce waste and improve budgeting.',
  },
];

const steps = [
  {
    title: 'Connect or add expenses',
    description: 'Start by adding daily transactions and keeping your records organized in one place.',
  },
  {
    title: 'Analyze spending patterns',
    description: 'See category-wise trends and monthly totals to identify where your money goes.',
  },
  {
    title: 'Improve habits with AI guidance',
    description: 'Follow simple recommendations that help you make smarter day-to-day decisions.',
  },
];

export default function HomePage() {
  const pageRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({
      autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
    });

    const context = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      tl.fromTo('[data-hero-badge]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.45 })
        .fromTo(
          '[data-hero-title]',
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.65 },
          '-=0.15', 
        )
        .fromTo(
          '[data-hero-subtitle]',
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.55 },
          '-=0.35',
        )
        .fromTo(
          '[data-hero-cta]',
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08 },
          '-=0.3',
        )
        .fromTo(
          '[data-hero-note]',
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          '-=0.25',
        )
        .fromTo(
          '[data-preview-glow]',
          { autoAlpha: 0, scale: 0.94 },
          { autoAlpha: 0.5, scale: 1, duration: 0.45 },
          '-=0.85',
        )
        .fromTo(
          '[data-preview-float]',
          { autoAlpha: 0, y: 20, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 },
          '<',
        );

      gsap.to('[data-preview-float]', {
        y: -3,
        duration: 2.2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });

      gsap.to('[data-preview-card]', {
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
        duration: 3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });

      gsap.to('[data-hero-copy]', {
        y: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-hero-copy]',
          start: 'top top',
          end: 'bottom top+=80',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      gsap.to('[data-preview-parallax]', {
        y: -28,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-preview-parallax]',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      gsap.to('[data-preview-glow]', {
        y: -32,
        autoAlpha: 0.4,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-preview-parallax]',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
        gsap.fromTo(
          group,
          { scale: 0.985, autoAlpha: 0 },
          {
            scale: 1,
            autoAlpha: 1,
            duration: 0.55,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: group,
              start: 'top 86%',
              once: true,
            },
          },
        );

        const cards = group.querySelectorAll('[data-reveal-card]');
        gsap.fromTo(
          cards,
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: group,
              start: 'top 84%',
              once: true,
            },
          },
        );
      });

      gsap.fromTo(
        '[data-cta-box]',
        { autoAlpha: 0, y: 24, scale: 0.98 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '[data-cta-box]',
            start: 'top 85%',
            once: true,
          },
        },
      );

      const currencyFormatter = new Intl.NumberFormat('en-IN');
      const countElements = pageRef.current
        ? pageRef.current.querySelectorAll('[data-count-value]')
        : [];
      gsap.utils.toArray(countElements).forEach((element) => {
        const countType = element.getAttribute('data-count-type');
        const targetValue = Number(element.getAttribute('data-target') || '0');
        const startValue = Number(element.getAttribute('data-start') || '0');
        const counter = { value: startValue };

        if (countType === 'currency') {
          element.textContent = `₹${currencyFormatter.format(startValue)}`;
        }
        if (countType === 'percent') {
          element.textContent = `+${startValue}%`;
        }

        gsap.to(counter, {
          value: targetValue,
          duration: 1.25,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '[data-preview-float]',
            start: 'top 92%',
            once: true,
          },
          onStart: () => {
            if (countType === 'currency') {
              element.textContent = `₹${currencyFormatter.format(startValue)}`;
              return;
            }
            if (countType === 'percent') {
              element.textContent = `+${startValue}%`;
            }
          },
          onUpdate: () => {
            const rounded = Math.round(counter.value);
            if (countType === 'currency') {
              element.textContent = `₹${currencyFormatter.format(rounded)}`;
              return;
            }
            if (countType === 'percent') {
              element.textContent = `+${rounded}%`;
            }
          },
        });
      });

      gsap.to('[data-bg-layer]', {
        opacity: 0.55,
        ease: 'none',
        scrollTrigger: {
          trigger: '#how-it-works',
          start: 'top 70%',
          end: 'bottom 20%',
          scrub: true,
        },
      });
    }, pageRef);

    return () => context.revert();
  }, []);

  return (
    <main ref={pageRef} className="relative min-h-screen bg-slate-50">
      <div
        data-bg-layer
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-slate-100 opacity-0"
      />
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <header data-hero-copy>
            <p data-hero-badge className="text-sm font-semibold uppercase tracking-wider text-primary-600">
              Fynix
            </p>
            <h1 data-hero-title className="mt-3 text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Track spending clearly and build better money habits with AI support
            </h1>
            <p data-hero-subtitle className="mt-4 max-w-xl text-base text-slate-600 md:text-lg">
              Fynix helps everyday users track spending with clarity, uncover category-level insights,
              and make better financial decisions through simple, practical guidance.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                data-hero-cta
                data-hero-cta-primary
                className="inline-flex rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 hover:bg-primary-700"
              >
                Log in to Fynix
              </Link>
              <a
                href="#how-it-works"
                data-hero-cta
                className="text-sm font-semibold text-slate-700 underline-offset-4 transition hover:text-slate-900 hover:underline"
              >
                See how it works
              </a>
            </div>
            <p data-hero-note className="mt-4 text-sm text-slate-500">
              Sign in options: Continue with Google or Continue with Email (Magic Link).
            </p>
          </header>

          <div className="relative" data-preview-parallax>
            <div
              data-preview-glow
              className="pointer-events-none absolute -inset-x-8 top-8 -z-10 mx-auto h-72 w-72 rounded-full bg-primary-200/80 blur-3xl"
            />
            <div data-preview-float>
              <div
                role="img"
                aria-label="Fynix dashboard preview placeholder"
                data-preview-card
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div data-preview-bar className="h-3 w-28 rounded bg-primary-100" />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div data-preview-metric className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Monthly spend</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                      <span
                        data-count-value
                        data-count-type="currency"
                        data-start="0"
                        data-target="18450"
                      >
                          ₹18,450
                        </span>
                      </p>
                    </div>
                    <div data-preview-metric className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Savings trend</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-600">
                        <span data-count-value data-count-type="percent" data-target="12">
                          +12%
                        </span>
                      </p>
                    </div>
                  </div>
                  <div
                    data-preview-top-category
                    className="mt-3 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <p className="text-xs text-slate-500">Top category</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">Food and groceries</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:pb-24" data-reveal-group>
        <div className="grid gap-4 md:grid-cols-3">
          {trustPoints.map((point) => (
            <article
              key={point.title}
              data-reveal-card
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">{point.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{point.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:pb-24" data-reveal-group>
        <h2 className="text-2xl font-bold text-slate-900">Core features</h2>
        <p className="mt-2 text-slate-600">Everything you need to build consistent financial awareness.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              data-reveal-card
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:pb-24" data-reveal-group>
        <h2 id="how-it-works" className="text-2xl font-bold text-slate-900">
          How it works
        </h2>
        <p className="mt-2 text-slate-600">A simple three-step flow built for non-technical users.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              data-reveal-card
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                Step {index + 1}
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:pb-24">
        <div
          data-cta-box
          className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-6 py-10 text-center shadow-sm ring-1 ring-primary-200"
        >
          <h2 className="text-2xl font-bold text-slate-900">Start tracking smarter with Fynix</h2>
          <p className="mt-2 text-slate-600">Build clarity in your finances with a calm, secure, and modern workflow.</p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Log in to Fynix
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold text-slate-800">Fynix</p>
          <nav className="flex items-center gap-5">
            <Link href="/privacy" className="transition hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-slate-900">
              Terms
            </Link>
            <Link href="/contact" className="transition hover:text-slate-900">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
