"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useThemeStore } from "@/lib/stores/theme-store";

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div className="fixed right-4 top-4 rounded-lg border border-border bg-card px-3 py-2 text-card-foreground shadow-sm">
      <Label htmlFor="theme-toggle" className="gap-3">
        <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
        <Switch
          id="theme-toggle"
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="Toggle theme"
        />
      </Label>
    </div>
  );
}

