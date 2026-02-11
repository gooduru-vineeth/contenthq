"use client";
import { create } from "zustand";

interface ProjectState {
  activeProjectId: string | null;
  isCreating: boolean;
  setActiveProject: (id: string | null) => void;
  setIsCreating: (value: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: null,
  isCreating: false,
  setActiveProject: (id) => set({ activeProjectId: id }),
  setIsCreating: (value) => set({ isCreating: value }),
}));
