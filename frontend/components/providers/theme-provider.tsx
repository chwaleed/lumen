"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useThemeStore } from "@/lib/stores/theme-store";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const pathname = usePathname();
  const theme = useThemeStore((state) => state.theme);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const isEditorialRoute = pathname === "/" || pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    if (isEditorialRoute) {
      return;
    }

    initializeTheme();
  }, [initializeTheme, isEditorialRoute]);

  useEffect(() => {
    if (isEditorialRoute) {
      document.documentElement.classList.remove("dark");
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [isEditorialRoute, theme]);

  return <>{children}</>;
}
