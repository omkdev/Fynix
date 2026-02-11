'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',
    consent: false,
  });

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (!form.consent) {
      setStatus({ type: 'error', message: 'Please confirm consent before submitting.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to send message.');
      }

      setStatus({ type: 'success', message: 'Message sent successfully. We will get back to you soon.' });
      setForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        website: '',
        consent: false,
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to send message.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <Link href="/" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
          Fynix
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Contact</h1>
        <p className="mt-3 text-slate-600">
          Need help with your account, privacy requests, or product feedback? Reach out using the
          details below.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Support channels</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>Email: support@fynix.app</li>
            <li>Privacy requests: privacy@fynix.app</li>
            <li>Response window: Within 2 business days</li>
          </ul>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Send us a message</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Honeypot field for simple bot filtering. Real users should not fill this. */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                value={form.website}
                onChange={handleChange}
                autoComplete="off"
                tabIndex={-1}
              />
            </div>

            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="subject" className="mb-1 block text-sm font-medium text-slate-700">
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="How can we help?"
              />
            </div>

            <div>
              <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="Write your message"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                checked={form.consent}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-400"
              />
              <span>
                I agree that Fynix may use this information to respond to my request. Read our{' '}
                <Link href="/privacy" className="font-medium text-primary-600 hover:text-primary-700">
                  Privacy
                </Link>{' '}
                and{' '}
                <Link href="/terms" className="font-medium text-primary-600 hover:text-primary-700">
                  Terms
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Sending...' : 'Send message'}
            </button>
          </form>

          {status.message && (
            <div
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                status.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {status.message}
            </div>
          )}
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
