"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardProjectsHook } from "@/app/(dashboard)/use-dashboard-projects-hook";

/**
 * Import a project from a zip.
 *
 * A hidden `<input type="file">` driven by a button, rather than a styled
 * input: the native control cannot be restyled to match, and `accept` still
 * gives the file picker its zip filter.
 */
export function ImportProjectButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const importProject = useDashboardProjectsHook((state) => state.importProject);
  const createStatus = useDashboardProjectsHook((state) => state.createStatus);

  const isBusy = createStatus === "submitting";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          // Reset first: picking the same file twice in a row fires no change
          // event otherwise, so a failed import could not be retried.
          event.target.value = "";
          if (!file) {
            return;
          }
          const projectId = await importProject(file);
          if (projectId) {
            router.push(`/project/${projectId}`);
          }
        }}
      />
      <Button
        variant="outline"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
      >
        {isBusy ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <Upload data-icon="inline-start" />
        )}
        {isBusy ? "Importing" : "Import .zip"}
      </Button>
    </>
  );
}
