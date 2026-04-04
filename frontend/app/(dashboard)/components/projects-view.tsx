"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/app/(dashboard)/components/project-card";
import { projectsData } from "@/app/(dashboard)/data/library-data";
import { useDashboardLayoutHook } from "@/app/(dashboard)/use-dashboard-layout-hook";

export function ProjectsView() {
  const router = useRouter();
  const searchQuery = useDashboardLayoutHook((state) => state.searchQuery);

  const filteredProjects = useMemo(
    () => projectsData.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery],
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-3xl font-semibold">All Projects</h2>
      {filteredProjects.length === 0 ? (
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
