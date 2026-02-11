"use client";
import { create } from "zustand";

interface SceneState {
  selectedSceneId: string | null;
  isEditing: boolean;
  setSelectedScene: (id: string | null) => void;
  setIsEditing: (value: boolean) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  selectedSceneId: null,
  isEditing: false,
  setSelectedScene: (id) => set({ selectedSceneId: id }),
  setIsEditing: (value) => set({ isEditing: value }),
}));
