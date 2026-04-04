"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/app/(dashboard)/components/project-card";
import { TemplateCard } from "@/app/(dashboard)/components/template-card";
import { projectsData, templatesData } from "@/app/(dashboard)/data/library-data";
import { useDashboardLayoutHook } from "@/app/(dashboard)/use-dashboard-layout-hook";

export function DashboardView() {
  const router = useRouter();
  const searchQuery = useDashboardLayoutHook((state) => state.searchQuery);

  const filteredProjects = useMemo(
    () => projectsData.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery],
  );

  const filteredTemplates = useMemo(
    () =>
      templatesData.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-3xl font-semibold">Start something new</h2>
        {filteredTemplates.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No templates found matching &quot;{searchQuery}&quot;
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.slice(0, 3).map((template) => (
              <TemplateCard key={template.id} template={template} onOpenProject={(id) => router.push(`/project/${id}`)} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl font-semibold">Recent Documents</h2>
        {filteredProjects.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No documents found matching &quot;{searchQuery}&quot;
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredProjects.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} onOpenProject={(id) => router.push(`/project/${id}`)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
