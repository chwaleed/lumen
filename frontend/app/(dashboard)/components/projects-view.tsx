"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/app/(dashboard)/components/project-card";
import { useDashboardLayoutHook } from "@/app/(dashboard)/use-dashboard-layout-hook";
import { useDashboardProjectsHook } from "@/app/(dashboard)/use-dashboard-projects-hook";

export function ProjectsView() {
  const router = useRouter();
  const searchQuery = useDashboardLayoutHook((state) => state.searchQuery);
  const projects = useDashboardProjectsHook((state) => state.projects);
  const fetchStatus = useDashboardProjectsHook((state) => state.fetchStatus);
  const errorMessage = useDashboardProjectsHook((state) => state.errorMessage);

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [projects, searchQuery],
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-3xl font-semibold">All Projects</h2>
      {fetchStatus === "loading" ? (
        <p className="py-12 text-center text-muted-foreground">Loading your projects...</p>
      ) : errorMessage ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : filteredProjects.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No projects found matching &quot;{searchQuery}&quot;
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpenProject={(id) => router.push(`/project/${id}`)} />
          ))}
        </div>
      )}
    </section>
  );
}
