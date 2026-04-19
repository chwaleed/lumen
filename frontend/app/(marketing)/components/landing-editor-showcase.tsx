"use client";

import {
  Bot,
  Check,
  FolderOpen,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHomeHook, type HomeAiAction } from "@/app/(marketing)/use-home-hook";
import { aiActionText } from "@/app/(marketing)/components/landing-content";

const aiActions: HomeAiAction[] = ["Improve", "Rewrite", "Explain"];

const editorLines = [
  {
    line: "1",
    parts: [
      ["landing-syntax-command", "\\documentclass"],
      ["landing-syntax-content", "{"] as const,
      ["landing-syntax-argument", "beamer"],
      ["landing-syntax-content", "}"],
    ],
  },
  {
    line: "2",
    parts: [
      ["landing-syntax-command", "\\usetheme"],
      ["landing-syntax-content", "{"] as const,
      ["landing-syntax-argument", "Madrid"],
      ["landing-syntax-content", "}"],
    ],
  },
  {
    line: "3",
    parts: [["landing-syntax-content", ""]],
  },
  {
    line: "4",
    parts: [
      ["landing-syntax-command", "\\title"],
      ["landing-syntax-content", "{"] as const,
      ["landing-syntax-argument", "Presentation"],
      ["landing-syntax-content", "}"],
    ],
  },
  {
    line: "5",
    parts: [
      ["landing-syntax-command", "\\begin"],
      ["landing-syntax-content", "{"] as const,
      ["landing-syntax-environment", "frame"],
      ["landing-syntax-content", "}{"] as const,
      ["landing-syntax-argument", "Introduction"],
      ["landing-syntax-content", "}"],
    ],
  },
  {
    line: "6",
    parts: [["landing-syntax-content landing-selection px-1", "  Add your presentation content here."]],
  },
  {
    line: "7",
    parts: [
      ["landing-syntax-command", "\\end"],
      ["landing-syntax-content", "{"] as const,
      ["landing-syntax-environment", "frame"],
      ["landing-syntax-content", "}"],
    ],
  },
];

export function LandingEditorShowcase() {
  const activeAiAction = useHomeHook((state) => state.activeAiAction);
  const setActiveAiAction = useHomeHook((state) => state.setActiveAiAction);

  return (
    <div className="landing-panel-shadow overflow-hidden rounded-[calc(var(--radius)*1.8)] border border-border bg-background">
      <div className="flex h-10 items-center gap-3 border-b border-border bg-panel px-3 sm:px-4">
        <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          <FolderOpen className="size-3" />
          Editor workspace
        </div>
      </div>

      <div className="grid min-h-[32rem] xl:grid-cols-[15rem_minmax(0,1fr)_22rem]">
        <aside className="border-b border-border bg-panel xl:border-r xl:border-b-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="truncate font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Beamer presentation
            </div>
            <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
              +
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3">
            {["main.tex", "new-file.tex", "chapters/", "refs.bib"].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground",
                  index === 0 && "bg-secondary text-foreground",
                  item.endsWith("/") && "opacity-70",
                )}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-3">
            <div className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              Snapshots
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {["Today, 14:23", "Today, 11:08", "Yesterday"].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      index === 0 ? "bg-success" : "bg-border",
                    )}
                  />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="relative border-b border-border xl:border-r xl:border-b-0">
          <div className="border-b border-border bg-soft px-4 pt-3">
            <div className="inline-flex rounded-t-xl border border-border border-b-background bg-background px-4 py-2 font-mono text-xs text-foreground">
              main.tex
            </div>
          </div>

          <div className="grid min-h-[22rem] grid-cols-[2.5rem_minmax(0,1fr)] bg-background sm:min-h-[24rem] sm:grid-cols-[3rem_minmax(0,1fr)]">
            <div className="border-r border-border bg-soft py-4 text-right font-mono text-xs text-muted-foreground">
              {editorLines.map((line) => (
                <div key={line.line} className="px-3 py-1.5">
                  {line.line}
                </div>
              ))}
            </div>
            <div className="overflow-x-auto px-3 py-4 font-mono text-xs leading-6 sm:px-4 sm:text-sm sm:leading-7">
              {editorLines.map((line) => (
                <div key={line.line} className="min-w-[22rem] py-1.5 sm:min-w-0">
                  {line.parts.map(([className, value], index) => (
                    <span key={`${line.line}-${index}`} className={className}>
                      {value}
                    </span>
                  ))}
                  {line.line === "7" ? (
                    <span className="landing-cursor ml-0.5 inline-block h-4 w-px bg-foreground align-middle" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-soft px-3 py-2 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted-foreground sm:px-4 sm:text-[0.7rem] sm:tracking-[0.16em]">
            <div className="flex items-center gap-2">
              <span className="landing-status-dot size-2 rounded-full bg-success" />
              Ready
            </div>
            <span>UTF-8</span>
            <span>LaTeX</span>
            <span className="ml-auto">Ln 6, Col 14</span>
          </div>

          <div className="mx-3 my-3 flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-3 shadow-lg sm:mx-4 xl:landing-floating xl:absolute xl:inset-x-4 xl:bottom-8 xl:my-0 xl:max-w-max xl:flex-row xl:items-center">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bot className="size-4" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
                Selected line assistant
              </div>
              <div className="flex flex-wrap gap-2">
                {aiActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setActiveAiAction(action)}
                    className={cn(
                      "rounded-full border border-border px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors",
                      activeAiAction === action &&
                        "bg-primary text-primary-foreground border-primary",
                    )}
                  >
                    {action}
                  </button>
                ))}
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                {aiActionText[activeAiAction]}
              </p>
            </div>
          </div>
        </div>

        <aside className="bg-paper text-paper-foreground">
          <div className="flex items-center gap-3 border-b border-border px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-soft-foreground">
              <span className="landing-status-dot size-2 rounded-full bg-success" />
              Preview
            </div>
            <div className="ml-auto flex items-center gap-1 text-soft-foreground">
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md border border-border bg-background"
              >
                <Minus className="size-3" />
              </button>
              <span className="px-2 font-mono text-[0.7rem] uppercase tracking-[0.16em]">
                100%
              </span>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md border border-border bg-background"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Presentation</h3>
              <p className="mt-1 text-sm text-soft-foreground">Your Name · Today</p>
            </div>
            <div className="rounded-lg border border-border bg-background/80 p-4">
              <div className="text-sm font-semibold">Title slide</div>
              <div className="mt-1 text-xs text-soft-foreground">
                Presentation · Your Name
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm leading-6">
              <div className="font-semibold">Agenda</div>
              <p>1. Introduction 2. Methods 3. Results</p>
              <div className="pt-2 font-semibold">Introduction</div>
              <p>
                Add your presentation content here. The frame environment wraps
                each slide in Beamer presentations.
              </p>
              <div className="rounded-md bg-background/80 px-3 py-2 text-sm text-soft-foreground">
                <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.16em]">
                  <Check className="size-3 text-success" />
                  {activeAiAction} suggestion ready
                </div>
              </div>
            </div>
            <div className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-soft-foreground">
              Auto-compile on
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
