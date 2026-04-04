"use client";

import { create } from "zustand";

type DashboardLayoutState = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
};

export const useDashboardLayoutHook = create<DashboardLayoutState>()((set) => ({
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: "" }),
}));
