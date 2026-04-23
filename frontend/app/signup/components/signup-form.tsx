"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignupHook } from "@/app/signup/use-signup-hook";

function SignupLogo() {
  return (
    <span className="flex items-center gap-2">
      <span className="font-serif text-2xl tracking-tight uppercase italic">TexAI</span>
      <span className="flex size-8 items-center justify-center bg-editorial-ink">
        <span className="font-serif text-xl text-editorial-paper italic">T</span>
      </span>
    </span>
  );
}

export function SignupForm() {
  const router = useRouter();
  const name = useSignupHook((state) => state.name);
  const email = useSignupHook((state) => state.email);
  const password = useSignupHook((state) => state.password);
  const showPassword = useSignupHook((state) => state.showPassword);
  const status = useSignupHook((state) => state.status);
  const message = useSignupHook((state) => state.message);
  const setName = useSignupHook((state) => state.setName);
  const setEmail = useSignupHook((state) => state.setEmail);
  const setPassword = useSignupHook((state) => state.setPassword);
  const setConfirmPassword = useSignupHook((state) => state.setConfirmPassword);
  const toggleShowPassword = useSignupHook((state) => state.toggleShowPassword);
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

  function onPasswordChange(value: string) {
    setPassword(value);
    setConfirmPassword(value);
  }

  const isError = status === "error";
  const isSuccess = status === "success";

  return (
    <main className="editorial-page flex min-h-screen flex-row-reverse font-sans">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-l border-editorial-line bg-editorial-alt-bg p-12 lg:flex">
        <div className="relative z-10 flex flex-col items-end text-right">
          <Link href="/" className="mb-12 flex items-center gap-2">
            <SignupLogo />
          </Link>
          <h1 className="mt-24 font-serif text-5xl leading-[1.1] italic lg:text-7xl">
            Begin your next great discovery.
          </h1>
        </div>
        <div className="relative z-10 text-right text-[10px] font-bold tracking-widest text-editorial-ink/30 uppercase">
          SYSTEM.CORE.SIGNUP
        </div>
        <div className="editorial-dot-pattern pointer-events-none absolute inset-0 bg-[length:12px_12px] opacity-[0.03]" />
      </div>

      <div className="relative flex w-full items-center justify-center bg-editorial-paper p-6 md:p-12 lg:w-1/2">
        <Link href="/" className="absolute top-8 left-6 flex items-center gap-2 md:left-12 lg:hidden" aria-label="TexAI home">
          <span className="flex size-8 items-center justify-center bg-editorial-ink">
            <span className="font-serif text-xl text-editorial-paper italic">T</span>
          </span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <p className="mb-6 text-[10px] font-semibold tracking-[0.3em] text-editorial-ink/50 uppercase">
            Join TexAI Systems
          </p>
          <h2 className="mb-10 font-serif text-4xl italic">Sign Up</h2>

          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="signup-name" className="text-[10px] font-bold tracking-[0.2em] uppercase">
                Full Name
              </Label>
              <Input
                id="signup-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="h-auto rounded-none border-x-0 border-t-0 border-b border-editorial-ink/20 bg-transparent px-0 py-3 text-sm shadow-none placeholder:text-editorial-ink/20 focus-visible:border-editorial-ink focus-visible:ring-0"
                placeholder="Isaac Newton"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="signup-email" className="text-[10px] font-bold tracking-[0.2em] uppercase">
                Email Address
              </Label>
              <Input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-auto rounded-none border-x-0 border-t-0 border-b border-editorial-ink/20 bg-transparent px-0 py-3 text-sm shadow-none placeholder:text-editorial-ink/20 focus-visible:border-editorial-ink focus-visible:ring-0"
                placeholder="isaac@cambridge.edu"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="signup-password" className="text-[10px] font-bold tracking-[0.2em] uppercase">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  autoComplete="new-password"
                  className="h-auto rounded-none border-x-0 border-t-0 border-b border-editorial-ink/20 bg-transparent py-3 pr-10 pl-0 text-sm shadow-none placeholder:text-editorial-ink/20 focus-visible:border-editorial-ink focus-visible:ring-0"
                  placeholder="Password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleShowPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-0 -translate-y-1/2 rounded-none text-editorial-ink/60 hover:bg-transparent hover:text-editorial-ink"
                >
                  {showPassword ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
                </Button>
              </div>
            </div>

            {message ? (
              <p
                className={
                  isError
                    ? "border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                    : isSuccess
                      ? "border border-editorial-ink/20 bg-editorial-bg px-4 py-3 text-sm text-editorial-ink"
                      : "border border-editorial-line bg-editorial-bg px-4 py-3 text-sm text-editorial-muted"
                }
              >
                {message}
              </p>
            ) : null}

            <Button
              type="submit"
              className="mt-2 h-auto w-full rounded-none bg-editorial-ink py-4 text-[10px] font-bold tracking-widest text-editorial-paper uppercase hover:bg-editorial-ink/85"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-8 flex gap-1 text-xs text-editorial-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-editorial-ink hover:underline">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
