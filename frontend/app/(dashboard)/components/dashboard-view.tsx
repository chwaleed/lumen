"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/app/(dashboard)/components/project-card";
import { TemplateCard } from "@/app/(dashboard)/components/template-card";
import { templatesData } from "@/app/(dashboard)/data/library-data";
import { useDashboardLayoutHook } from "@/app/(dashboard)/use-dashboard-layout-hook";
import { useDashboardProjectsHook } from "@/app/(dashboard)/use-dashboard-projects-hook";

export function DashboardView() {
  const router = useRouter();
  const searchQuery = useDashboardLayoutHook((state) => state.searchQuery);
  const projects = useDashboardProjectsHook((state) => state.projects);
  const fetchStatus = useDashboardProjectsHook((state) => state.fetchStatus);
  const createStatus = useDashboardProjectsHook((state) => state.createStatus);
  const errorMessage = useDashboardProjectsHook((state) => state.errorMessage);
  const createProject = useDashboardProjectsHook((state) => state.createProject);

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [projects, searchQuery],
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
              <TemplateCard
                key={template.id}
                template={template}
                onCreateProject={async (templateId) => {
                  const projectId = await createProject({
                    templateId,
                    name: template.name,
                  });
                  if (projectId) {
                    router.push(`/project/${projectId}`);
                  }
                }}
                isCreating={createStatus === "submitting"}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl font-semibold">Recent Documents</h2>
        {fetchStatus === "loading" ? (
          <p className="py-12 text-center text-muted-foreground">Loading your projects...</p>
        ) : errorMessage ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : filteredProjects.length === 0 ? (
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
