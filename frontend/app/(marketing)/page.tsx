import type { Metadata } from "next";
import { LandingPage } from "@/app/(marketing)/components/landing-page";

export const metadata: Metadata = {
  title: "TexAI | AI-Powered LaTeX Workspace",
  description:
    "Write papers, slides, and technical documents in a focused LaTeX editor with live preview, snapshots, and inline AI assistance.",
};

export default function HomePage() {
  return <LandingPage />;
}
