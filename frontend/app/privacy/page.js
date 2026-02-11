import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 md:py-16">
        <Link href="/" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
          Fynix
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Privacy</h1>
        <p className="mt-3 text-slate-600">
          Fynix is privacy-first. We only use your data to deliver core budgeting features and improve
          account security.
        </p>

        <div className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-slate-900">What we collect</h2>
            <p className="mt-2 text-sm text-slate-600">
              Account details, transaction records you add, and basic usage logs required to keep the
              app reliable and secure.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-slate-900">How we use it</h2>
            <p className="mt-2 text-sm text-slate-600">
              Data is used for sign-in, expense tracking, insights, and product support. We do not sell
              personal data for advertising.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-slate-900">Your control</h2>
            <p className="mt-2 text-sm text-slate-600">
              You can request account deletion and data removal by contacting us through the Contact
              page.
            </p>
          </section>
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
