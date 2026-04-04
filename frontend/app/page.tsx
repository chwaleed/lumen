import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Lumen Frontend</h1>
        <p className="mt-2 text-zinc-600">
          Quick check page for your auth flow.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Open Signup Page and test the auth flow
        </Link>
      </div>
    </main>
  );
}
