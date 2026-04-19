"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";
import { useSignupHook } from "@/app/signup/use-signup-hook";

export function SignupForm() {
  const router = useRouter();
  const name = useSignupHook((state) => state.name);
  const email = useSignupHook((state) => state.email);
  const password = useSignupHook((state) => state.password);
  const confirmPassword = useSignupHook((state) => state.confirmPassword);
  const status = useSignupHook((state) => state.status);
  const message = useSignupHook((state) => state.message);
  const setName = useSignupHook((state) => state.setName);
  const setEmail = useSignupHook((state) => state.setEmail);
  const setPassword = useSignupHook((state) => state.setPassword);
  const setConfirmPassword = useSignupHook((state) => state.setConfirmPassword);
  const submit = useSignupHook((state) => state.submit);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await submit();

    if (result.success && result.sessionEstablished) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    if (result.success) {
      router.push("/login");
    }
  }

  const isError = status === "error";
  const isSuccess = status === "success";

  return (
    <AuthShell
      title="Create an account"
      subtitle="Join our mindful workspace today."
      footerText="Already have an account?"
      footerLinkLabel="Log in"
      footerLinkHref="/login"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-name" className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
            Full name
          </Label>
          <Input
            id="signup-name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className="h-12 rounded-2xl border-border/60 bg-soft px-4 text-sm shadow-none"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-email" className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
            Email address
          </Label>
          <Input
            id="signup-email"
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
          <Label htmlFor="signup-password" className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
            Password
          </Label>
          <Input
            id="signup-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="h-12 rounded-2xl border-border/60 bg-soft px-4 text-sm shadow-none"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-confirm-password" className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
            Confirm password
          </Label>
          <Input
            id="signup-confirm-password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="h-12 rounded-2xl border-border/60 bg-soft px-4 text-sm shadow-none"
            required
          />
        </div>

        {message ? (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm ${
              isError
                ? "border-destructive/20 bg-destructive/8 text-destructive"
                : isSuccess
                  ? "border-primary/20 bg-primary/8 text-primary"
                  : "border-border bg-soft text-muted-foreground"
            }`}
          >
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-full text-sm font-medium"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
