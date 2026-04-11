"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardSidebar, type DashboardTab } from "@/app/(dashboard)/components/dashboard-sidebar";
import { ProjectsHeader } from "@/app/(dashboard)/components/projects-header";
import { useDashboardLayoutHook } from "@/app/(dashboard)/use-dashboard-layout-hook";
import { useDashboardProjectsHook } from "@/app/(dashboard)/use-dashboard-projects-hook";
import { useThemeStore } from "@/lib/stores/theme-store";

type DashboardShellProps = {
  children: React.ReactNode;
};

function getActiveTab(pathname: string): DashboardTab {
  if (pathname === "/projects") {
    return "all";
  }

  if (pathname === "/templates") {
    return "templates";
  }

  return "recent";
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const searchQuery = useDashboardLayoutHook((state) => state.searchQuery);
  const setSearchQuery = useDashboardLayoutHook((state) => state.setSearchQuery);
  const createProject = useDashboardProjectsHook((state) => state.createProject);
  const createStatus = useDashboardProjectsHook((state) => state.createStatus);
  const ensureProjectsLoaded = useDashboardProjectsHook((state) => state.ensureProjectsLoaded);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");

    const sync = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    sync();
    media.addEventListener("change", sync);

    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    void ensureProjectsLoaded();
  }, [ensureProjectsLoaded]);

  const activeTab = useMemo(() => getActiveTab(pathname ?? "/dashboard"), [pathname]);
  const isDarkMode = theme === "dark";

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

  const handleLogout = () => {
    startTransition(() => {
      void (async () => {
        await fetch("/api/auth/logout", {
          method: "POST",
        });
        router.push("/login");
        router.refresh();
      })();
    });
  };

  const handleCreateProject = () => {
    startTransition(() => {
      void (async () => {
        const projectId = await createProject();
        if (projectId) {
          router.push(`/project/${projectId}`);
        }
      })();
    });
  };

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      {isMobile && sidebarOpen ? (
        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <DashboardSidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        activeTab={activeTab}
        setSidebarOpen={setSidebarOpen}
        onSelectTab={handleSelectTab}
        onCreateProject={handleCreateProject}
        onLogout={handleLogout}
        isCreatingProject={createStatus === "submitting"}
        user={{ name: "User", email: "user@example.com" }}
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

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
