import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-primary-600 mb-2">Fynix</h1>
      <p className="text-slate-600 mb-8">AI-powered personal finance</p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary-600 px-6 py-3 text-white font-medium hover:bg-primary-700 transition"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}
