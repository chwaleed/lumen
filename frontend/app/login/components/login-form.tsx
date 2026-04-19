"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";
import { useLoginHook } from "@/app/login/use-login-hook";

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
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Return to your quiet writing space."
      footerText="Need an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/signup"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-email" className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
            Email address
          </Label>
          <Input
            id="login-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="h-12 rounded-2xl border-border/60 bg-soft px-4 text-sm shadow-none"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-password" className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
            Password
          </Label>
          <Input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="h-12 rounded-2xl border-border/60 bg-soft px-4 text-sm shadow-none"
            required
          />
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-full text-sm font-medium"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </AuthShell>
  );
}
