"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";
import { useLoginHook } from "@/app/login/use-login-hook";

const LOGIN_STORAGE_KEY = "lumen_is_logged_in";

export function LoginForm() {
  const router = useRouter();
  const email = useLoginHook((state) => state.email);
  const password = useLoginHook((state) => state.password);
  const status = useLoginHook((state) => state.status);
  const errorMessage = useLoginHook((state) => state.errorMessage);
  const setEmail = useLoginHook((state) => state.setEmail);
  const setPassword = useLoginHook((state) => state.setPassword);
  const submit = useLoginHook((state) => state.submit);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isSuccess = await submit();

    if (isSuccess) {
      window.localStorage.setItem(LOGIN_STORAGE_KEY, "true");
      router.push("/dashboard");
    }
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Continue your writing session."
      footerText="Need an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/signup"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={status === "submitting"}>
          {status === "submitting" ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </AuthShell>
  );
}
