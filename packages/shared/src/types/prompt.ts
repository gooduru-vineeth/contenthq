export const PROMPT_TYPES = [
  "story_writing",
  "scene_generation",
  "image_generation",
  "image_refinement",
  "visual_verification",
] as const;

export type PromptType = (typeof PROMPT_TYPES)[number];

export const PERSONA_CATEGORIES = [
  "tone",
  "audience",
  "visual_style",
  "narrative_style",
] as const;

export type PersonaCategory = (typeof PERSONA_CATEGORIES)[number];

export interface PromptTemplate {
  id: string;
  type: PromptType;
  name: string;
  description: string | null;
  content: string;
  version: number;
  isActive: boolean;
  createdBy: string | null;
  variables: string[];
  outputSchemaHint: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface Persona {
  id: string;
  category: PersonaCategory;
  name: string;
  label: string;
  description: string | null;
  promptFragment: string;
  createdBy: string | null;
  version: number;
  isDefault: boolean;
  uiConfig: {
    gradient?: string;
    icon?: string;
    color?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  type: PromptType;
  name: string;
  description: string | null;
  content: string;
  variables: string[];
  outputSchemaHint: unknown;
  editedBy: string | null;
  changeNote: string | null;
  createdAt: Date;
}

export interface PersonaVersion {
  id: string;
  personaId: string;
  version: number;
  category: PersonaCategory;
  name: string;
  label: string;
  description: string | null;
  promptFragment: string;
  uiConfig: {
    gradient?: string;
    icon?: string;
    color?: string;
  } | null;
  editedBy: string | null;
  changeNote: string | null;
  createdAt: Date;
}

export interface ProjectPromptConfig {
  id: string;
  projectId: string;
  promptOverrides: Record<string, string>;
  personaSelections: Record<string, string>;
  customVariables: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedPromptConfig {
  template: {
    id: string;
    content: string;
    version: number;
  };
  personas: Persona[];
  composedPrompt: string;
}

export const PROMPT_TYPE_LABELS: Record<PromptType, string> = {
  story_writing: "Story Writing",
  scene_generation: "Scene Generation",
  image_generation: "Image Generation",
  image_refinement: "Image Refinement",
  visual_verification: "Visual Verification",
};

export const PERSONA_CATEGORY_LABELS: Record<PersonaCategory, string> = {
  tone: "Tone",
  audience: "Audience",
  visual_style: "Visual Style",
  narrative_style: "Narrative Style",
};
