import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-card-foreground">Lumen Frontend</h1>
        <p className="mt-2 text-muted-foreground">
          Quick check page for your auth flow.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open Signup Page and test the auth flow
        </Link>
      </div>
    </main>
  );
}
