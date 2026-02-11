import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-primary-600 mb-2">Fynix</h1>
      <p className="text-slate-600 mb-8">AI-powered personal finance</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-primary-600 px-6 py-3 text-white font-medium hover:bg-primary-700 transition"
        >
          Login
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-slate-700 font-medium hover:bg-slate-100 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
