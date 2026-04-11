"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { TemplateCard } from "@/app/(dashboard)/components/template-card";
import { templatesData } from "@/app/(dashboard)/data/library-data";
import { useDashboardLayoutHook } from "@/app/(dashboard)/use-dashboard-layout-hook";
import { useDashboardProjectsHook } from "@/app/(dashboard)/use-dashboard-projects-hook";

export function TemplatesView() {
  const router = useRouter();
  const searchQuery = useDashboardLayoutHook((state) => state.searchQuery);
  const createProject = useDashboardProjectsHook((state) => state.createProject);
  const createStatus = useDashboardProjectsHook((state) => state.createStatus);

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
    <section className="flex flex-col gap-4">
      <h2 className="text-3xl font-semibold">Template Gallery</h2>
      {filteredTemplates.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No templates found matching &quot;{searchQuery}&quot;
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
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
  );
}
