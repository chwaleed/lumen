"use client";

import { LayoutGrid, Plus, Sidebar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHomeHook } from "@/app/(marketing)/use-home-hook";
import {
  documentCards,
  templateCards,
} from "@/app/(marketing)/components/landing-content";

export function LandingDashboardShowcase() {
  const activeTemplate = useHomeHook((state) => state.activeTemplate);
  const setActiveTemplate = useHomeHook((state) => state.setActiveTemplate);

  return (
    <div className="landing-panel-shadow overflow-hidden rounded-[calc(var(--radius)*1.8)] border border-border bg-background">
      <div className="flex h-10 items-center gap-3 border-b border-border bg-panel px-3 sm:px-4">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          <LayoutGrid className="size-3" />
          Dashboard
        </div>
      </div>

      <div className="grid min-h-[24rem] md:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-panel md:border-r md:border-b-0">
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              <Plus className="size-4" />
              New project
            </button>
            <div className="flex flex-col gap-1">
              {["Overview", "Templates", "Recent work"].map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm text-muted-foreground",
                    index === 1 && "bg-secondary text-foreground",
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-5 p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              Quick start
            </p>
            <h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
              Start from a template that matches your work.
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templateCards.map((template) => {
              const Icon = template.icon;
              const isActive = activeTemplate === template.key;

              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => setActiveTemplate(template.key)}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 text-left transition-colors",
                    isActive && "border-foreground/20 bg-secondary",
                  )}
                >
                  <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-panel text-muted-foreground">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold">{template.title}</div>
                    <div className="text-sm leading-6 text-muted-foreground">
                      {template.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sidebar className="size-4 text-muted-foreground" />
              Recent documents
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {documentCards.map((document) => (
                <div
                  key={document.title}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-panel text-muted-foreground">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm font-medium">{document.title}</div>
                    <div className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
                      {document.updatedAt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
