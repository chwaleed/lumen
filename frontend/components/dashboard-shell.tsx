"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardSidebar, { DashboardTab } from "@/components/sidebar";
import { ProjectsHeader } from "@/components/header";
import { useThemeStore } from "@/lib/stores/theme-store";

type DashboardShellProps = {
  children: React.ReactNode;
};

function getActiveTab(pathname: string | null): DashboardTab {
  if (pathname === "/projects") {
    return "all";
  }

  if (pathname === "/templates") {
    return "templates";
  }

  return "recent";
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const syncDeviceState = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    syncDeviceState();
    mediaQuery.addEventListener("change", syncDeviceState);

    return () => {
      mediaQuery.removeEventListener("change", syncDeviceState);
    };
  }, []);

  const isDarkMode = useMemo(() => theme === "dark", [theme]);
  const activeTab = useMemo(() => getActiveTab(pathname), [pathname]);

  const handleSelectTab = (tab: DashboardTab) => {
    if (tab === "recent") {
      router.push("/dashboard");
      return;
    }

    if (tab === "all") {
      router.push("/projects");
      return;
    }

    router.push("/templates");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenProject={(projectId) => router.push(`/project/${projectId}`)}
        user={{ name: "Demo User", email: "demo@texai.dev" }}
        onLogout={() => router.push("/login")}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProjectsHeader
          isMobile={isMobile}
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setSidebarOpen={setSidebarOpen}
          toggleTheme={() => setTheme(isDarkMode ? "light" : "dark")}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
