import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 md:py-16">
        <Link href="/" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
          Fynix
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Terms</h1>
        <p className="mt-3 text-slate-600">
          These terms describe how to use Fynix responsibly and what you can expect from the service.
        </p>

        <div className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-slate-900">Use of service</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use Fynix for lawful personal finance tracking. Do not attempt to disrupt, abuse, or
              reverse engineer protected systems.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-slate-900">Account responsibility</h2>
            <p className="mt-2 text-sm text-slate-600">
              You are responsible for your account activity and for keeping your sign-in method secure.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-slate-900">Availability</h2>
            <p className="mt-2 text-sm text-slate-600">
              We aim for stable uptime, but service may be interrupted for maintenance, upgrades, or
              unexpected incidents.
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
