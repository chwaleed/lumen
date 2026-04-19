"use client";

import { create } from "zustand";

export type HomeTemplateKey = "article" | "beamer" | "thesis";
export type HomeAiAction = "Improve" | "Rewrite" | "Explain";

type HomeState = {
  activeTemplate: HomeTemplateKey;
  activeAiAction: HomeAiAction;
  setActiveTemplate: (template: HomeTemplateKey) => void;
  setActiveAiAction: (action: HomeAiAction) => void;
};

export const useHomeHook = create<HomeState>()((set) => ({
  activeTemplate: "beamer",
  activeAiAction: "Improve",
  setActiveTemplate: (activeTemplate) => set({ activeTemplate }),
  setActiveAiAction: (activeAiAction) => set({ activeAiAction }),
}));
