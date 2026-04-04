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
    const isSuccess = await submit();

    if (isSuccess) {
      router.push("/login");
    }
  }

  const isError = status === "error";
  const isSuccess = status === "success";

  return (
    <AuthShell
      title="Create account"
      subtitle="Start collaborating in your workspace."
      footerText="Already have an account?"
      footerLinkLabel="Log in"
      footerLinkHref="/login"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name</Label>
          <Input
            id="signup-name"
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-confirm-password">Confirm password</Label>
          <Input
            id="signup-confirm-password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {message ? (
          <p
            className={`rounded-md border px-3 py-2 text-sm ${
              isError
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : isSuccess
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={status === "submitting"}>
          {status === "submitting" ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
