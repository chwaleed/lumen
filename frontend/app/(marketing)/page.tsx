import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LandingPage } from "@/app/(marketing)/components/landing-page";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from "@/lib/auth/cookies";
import { isJwtExpired } from "@/lib/auth/jwt";

export const metadata: Metadata = {
  title: "TexAI | AI-Powered LaTeX Workspace",
  description:
    "Write papers, slides, and technical documents in a focused LaTeX editor with live preview, snapshots, and inline AI assistance.",
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(
    (accessToken && !isJwtExpired(accessToken)) || refreshToken,
  );

  return <LandingPage isAuthenticated={isAuthenticated} />;
}
