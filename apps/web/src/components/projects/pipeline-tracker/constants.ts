import {
  Download,
  Pen,
  Layers,
  Image,
  ShieldCheck,
  Music,
  Clapperboard,
  FileText,
  Monitor,
  Code,
  Play,
} from "lucide-react";
import { PipelineStage } from "@contenthq/shared";
import type { ConsolidatedStage } from "./types";

/** AI Video pipeline (default — original 10-stage pipeline) */
const AI_VIDEO_STAGES: ConsolidatedStage[] = [
  {
    id: "ingestion",
    label: "Import",
    tagline: "Fetching raw content",
    icon: Download,
    color: "#06B6D4",
    colorEnd: "#0891B2",
    rawStages: [PipelineStage.INGESTION],
    primaryStage: PipelineStage.INGESTION,
  },
  {
    id: "story-writing",
    label: "Write Script",
    tagline: "Crafting the narrative",
    icon: Pen,
    color: "#8B5CF6",
    colorEnd: "#7C3AED",
    rawStages: [PipelineStage.STORY_WRITING],
    primaryStage: PipelineStage.STORY_WRITING,
  },
  {
    id: "scene-generation",
    label: "Storyboard",
    tagline: "Breaking into scenes",
    icon: Layers,
    color: "#3B82F6",
    colorEnd: "#2563EB",
    rawStages: [PipelineStage.SCENE_GENERATION],
    primaryStage: PipelineStage.SCENE_GENERATION,
  },
  {
    id: "visual-generation",
    label: "Create Visuals",
    tagline: "Creating visuals & video",
    icon: Image,
    color: "#6366F1",
    colorEnd: "#4F46E5",
    rawStages: [PipelineStage.VISUAL_GENERATION, PipelineStage.VIDEO_GENERATION],
    primaryStage: PipelineStage.VISUAL_GENERATION,
  },
  {
    id: "visual-verification",
    label: "Quality Check",
    tagline: "Quality assurance",
    icon: ShieldCheck,
    color: "#10B981",
    colorEnd: "#059669",
    rawStages: [PipelineStage.VISUAL_VERIFICATION],
    primaryStage: PipelineStage.VISUAL_VERIFICATION,
  },
  {
    id: "audio-layering",
    label: "Voice & Music",
    tagline: "Voice & music mixing",
    icon: Music,
    color: "#F59E0B",
    colorEnd: "#D97706",
    rawStages: [PipelineStage.TTS_GENERATION, PipelineStage.AUDIO_MIXING],
    primaryStage: PipelineStage.TTS_GENERATION,
  },
  {
    id: "assembly",
    label: "Final Video",
    tagline: "Final video render",
    icon: Clapperboard,
    color: "#EC4899",
    colorEnd: "#DB2777",
    rawStages: [PipelineStage.VIDEO_ASSEMBLY],
    primaryStage: PipelineStage.VIDEO_ASSEMBLY,
  },
];

/**
 * Presentation pipeline — slide ingestion, rendering, narration, TTS, mixing, assembly.
 * Uses the same PipelineStage enum values mapped via projectStatus.
 */
const PRESENTATION_STAGES: ConsolidatedStage[] = [
  {
    id: "ppt-ingestion",
    label: "Import Slides",
    tagline: "Parsing presentation file",
    icon: FileText,
    color: "#06B6D4",
    colorEnd: "#0891B2",
    rawStages: [PipelineStage.INGESTION],
    primaryStage: PipelineStage.INGESTION,
  },
  {
    id: "slide-rendering",
    label: "Render Slides",
    tagline: "Capturing slide images",
    icon: Monitor,
    color: "#6366F1",
    colorEnd: "#4F46E5",
    rawStages: [PipelineStage.VISUAL_GENERATION],
    primaryStage: PipelineStage.VISUAL_GENERATION,
  },
  {
    id: "narration-script",
    label: "Narration Script",
    tagline: "Generating narration",
    icon: Pen,
    color: "#8B5CF6",
    colorEnd: "#7C3AED",
    rawStages: [PipelineStage.STORY_WRITING],
    primaryStage: PipelineStage.STORY_WRITING,
  },
  {
    id: "audio-layering",
    label: "Voice & Music",
    tagline: "Voice & music mixing",
    icon: Music,
    color: "#F59E0B",
    colorEnd: "#D97706",
    rawStages: [PipelineStage.TTS_GENERATION, PipelineStage.AUDIO_MIXING],
    primaryStage: PipelineStage.TTS_GENERATION,
  },
  {
    id: "assembly",
    label: "Final Video",
    tagline: "Assembling presentation video",
    icon: Clapperboard,
    color: "#EC4899",
    colorEnd: "#DB2777",
    rawStages: [PipelineStage.VIDEO_ASSEMBLY],
    primaryStage: PipelineStage.VIDEO_ASSEMBLY,
  },
];

/**
 * Remotion pipeline — content ingestion, story, scenes, composition, render.
 */
const REMOTION_STAGES: ConsolidatedStage[] = [
  {
    id: "ingestion",
    label: "Import",
    tagline: "Fetching raw content",
    icon: Download,
    color: "#06B6D4",
    colorEnd: "#0891B2",
    rawStages: [PipelineStage.INGESTION],
    primaryStage: PipelineStage.INGESTION,
  },
  {
    id: "story-writing",
    label: "Write Script",
    tagline: "Crafting the narrative",
    icon: Pen,
    color: "#8B5CF6",
    colorEnd: "#7C3AED",
    rawStages: [PipelineStage.STORY_WRITING],
    primaryStage: PipelineStage.STORY_WRITING,
  },
  {
    id: "scene-generation",
    label: "Storyboard",
    tagline: "Breaking into scenes",
    icon: Layers,
    color: "#3B82F6",
    colorEnd: "#2563EB",
    rawStages: [PipelineStage.SCENE_GENERATION],
    primaryStage: PipelineStage.SCENE_GENERATION,
  },
  {
    id: "remotion-composition",
    label: "Composition",
    tagline: "Building React compositions",
    icon: Code,
    color: "#6366F1",
    colorEnd: "#4F46E5",
    rawStages: [PipelineStage.VISUAL_GENERATION],
    primaryStage: PipelineStage.VISUAL_GENERATION,
  },
  {
    id: "remotion-render",
    label: "Render Video",
    tagline: "Remotion rendering",
    icon: Play,
    color: "#EC4899",
    colorEnd: "#DB2777",
    rawStages: [PipelineStage.VIDEO_ASSEMBLY],
    primaryStage: PipelineStage.VIDEO_ASSEMBLY,
  },
];

/**
 * Motion Canvas pipeline — content ingestion, story, scenes, animation, render.
 */
const MOTION_CANVAS_STAGES: ConsolidatedStage[] = [
  {
    id: "ingestion",
    label: "Import",
    tagline: "Fetching raw content",
    icon: Download,
    color: "#06B6D4",
    colorEnd: "#0891B2",
    rawStages: [PipelineStage.INGESTION],
    primaryStage: PipelineStage.INGESTION,
  },
  {
    id: "story-writing",
    label: "Write Script",
    tagline: "Crafting the narrative",
    icon: Pen,
    color: "#8B5CF6",
    colorEnd: "#7C3AED",
    rawStages: [PipelineStage.STORY_WRITING],
    primaryStage: PipelineStage.STORY_WRITING,
  },
  {
    id: "scene-generation",
    label: "Storyboard",
    tagline: "Breaking into scenes",
    icon: Layers,
    color: "#3B82F6",
    colorEnd: "#2563EB",
    rawStages: [PipelineStage.SCENE_GENERATION],
    primaryStage: PipelineStage.SCENE_GENERATION,
  },
  {
    id: "motion-canvas-scene",
    label: "Animation",
    tagline: "Creating motion scenes",
    icon: Code,
    color: "#6366F1",
    colorEnd: "#4F46E5",
    rawStages: [PipelineStage.VISUAL_GENERATION],
    primaryStage: PipelineStage.VISUAL_GENERATION,
  },
  {
    id: "motion-canvas-render",
    label: "Render Video",
    tagline: "Motion Canvas rendering",
    icon: Play,
    color: "#EC4899",
    colorEnd: "#DB2777",
    rawStages: [PipelineStage.VIDEO_ASSEMBLY],
    primaryStage: PipelineStage.VIDEO_ASSEMBLY,
  },
];

/** Keep default export for backward compatibility */
export const CONSOLIDATED_STAGES = AI_VIDEO_STAGES;

/** Per-template consolidated stage definitions */
const TEMPLATE_STAGES: Record<string, ConsolidatedStage[]> = {
  "builtin-ai-video": AI_VIDEO_STAGES,
  "builtin-presentation": PRESENTATION_STAGES,
  "builtin-remotion": REMOTION_STAGES,
  "builtin-motion-canvas": MOTION_CANVAS_STAGES,
};

/** Get consolidated stages for a given pipeline template ID */
export function getConsolidatedStages(
  templateId: string | null | undefined,
): ConsolidatedStage[] {
  return TEMPLATE_STAGES[templateId ?? "builtin-ai-video"] ?? AI_VIDEO_STAGES;
}
