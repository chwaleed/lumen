"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginHook } from "@/app/login/use-login-hook";

function LoginLogo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center bg-editorial-ink">
        <span className="font-serif text-xl text-editorial-paper italic">T</span>
      </span>
      <span className="font-serif text-2xl tracking-tight uppercase italic">TexAI</span>
    </span>
  );
}

export function LoginForm() {
  const router = useRouter();
  const email = useLoginHook((state) => state.email);
  const password = useLoginHook((state) => state.password);
  const showPassword = useLoginHook((state) => state.showPassword);
  const status = useLoginHook((state) => state.status);
  const errorMessage = useLoginHook((state) => state.errorMessage);
  const setEmail = useLoginHook((state) => state.setEmail);
  const setPassword = useLoginHook((state) => state.setPassword);
  const toggleShowPassword = useLoginHook((state) => state.toggleShowPassword);
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
    <main className="editorial-page flex min-h-screen font-sans">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-editorial-line bg-editorial-paper p-12 lg:flex">
        <div className="relative z-10">
          <Link href="/" className="mb-12 flex items-center gap-2">
            <LoginLogo />
          </Link>
          <h1 className="mt-24 font-serif text-5xl leading-[1.1] italic lg:text-7xl">
            Welcome back to your research.
          </h1>
        </div>
        <div className="relative z-10 text-[10px] font-bold tracking-widest text-editorial-ink/30 uppercase">
          SYSTEM.CORE.LOGIN
        </div>
        <div className="editorial-dot-pattern pointer-events-none absolute inset-0 bg-[length:24px_24px] opacity-[0.03]" />
      </div>

      <div className="relative flex w-full items-center justify-center p-6 md:p-12 lg:w-1/2">
        <Link href="/" className="absolute top-8 left-6 flex items-center gap-2 md:left-12 lg:hidden" aria-label="TexAI home">
          <span className="flex size-8 items-center justify-center bg-editorial-ink">
            <span className="font-serif text-xl text-editorial-paper italic">T</span>
          </span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <p className="mb-6 text-[10px] font-semibold tracking-[0.3em] text-editorial-ink/50 uppercase">
            Access your workspace
          </p>
          <h2 className="mb-10 font-serif text-4xl italic">Log In</h2>

          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email" className="text-[10px] font-bold tracking-[0.2em] uppercase">
                Email Address
              </Label>
              <Input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-auto rounded-none border-x-0 border-t-0 border-b border-editorial-ink/20 bg-transparent px-0 py-3 text-sm shadow-none placeholder:text-editorial-ink/20 focus-visible:border-editorial-ink focus-visible:ring-0"
                placeholder="you@university.edu"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="login-password" className="text-[10px] font-bold tracking-[0.2em] uppercase">
                  Password
                </Label>
                <a href="#" className="text-[10px] underline transition-opacity hover:opacity-70">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
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

            {errorMessage ? (
              <p className="border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              className="mt-2 h-auto w-full rounded-none bg-editorial-ink py-4 text-[10px] font-bold tracking-widest text-editorial-paper uppercase hover:bg-editorial-ink/85"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-8 flex gap-1 text-xs text-editorial-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-editorial-ink hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
