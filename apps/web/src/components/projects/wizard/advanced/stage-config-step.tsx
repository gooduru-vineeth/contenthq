"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import {
  Download,
  Pen,
  Layers,
  Image,
  ShieldCheck,
  Film,
  Mic,
  Music,
  Type,
  Clapperboard,
  FileText,
  Monitor,
  Code,
  Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StagePanel } from "./stage-panel";
import { IngestionConfig } from "./ingestion-config";
import { StoryWritingConfig } from "./story-writing-config";
import { SceneGenerationConfig } from "./scene-generation-config";
import { VisualGenerationConfig } from "./visual-generation-config";
import { VisualVerificationConfig } from "./visual-verification-config";
import { VideoGenerationConfig } from "./video-generation-config";
import { TtsConfig } from "./tts-config";
import { AudioMixingConfig } from "./audio-mixing-config";
import { CaptionConfig } from "./caption-config";
import { AssemblyConfig } from "./assembly-config";

interface StageDefinition {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  configKey: string;
  defaultEnabled?: boolean;
  content: React.ReactNode | null;
}

/** Stage panels available for the AI Video pipeline (all 10 stages) */
const AI_VIDEO_STAGES: StageDefinition[] = [
  { key: "ingestion", title: "Ingestion", description: "Content extraction settings", icon: Download, configKey: "stageConfigs.ingestion", content: <IngestionConfig /> },
  { key: "storyWriting", title: "Story Writing", description: "AI story generation", icon: Pen, configKey: "stageConfigs.storyWriting", content: <StoryWritingConfig /> },
  { key: "sceneGeneration", title: "Scene Generation", description: "Visual scene planning", icon: Layers, configKey: "stageConfigs.sceneGeneration", content: <SceneGenerationConfig /> },
  { key: "visualGeneration", title: "Visual Generation", description: "Image creation", icon: Image, configKey: "stageConfigs.visualGeneration", content: <VisualGenerationConfig /> },
  { key: "visualVerification", title: "Visual Verification", description: "Quality checking", icon: ShieldCheck, configKey: "stageConfigs.visualVerification", content: <VisualVerificationConfig /> },
  { key: "videoGeneration", title: "Video Generation", description: "Video clip creation", icon: Film, configKey: "stageConfigs.videoGeneration", content: <VideoGenerationConfig /> },
  { key: "tts", title: "Text-to-Speech", description: "Voice narration", icon: Mic, configKey: "stageConfigs.tts", content: <TtsConfig /> },
  { key: "audioMixing", title: "Audio Mixing", description: "Audio layering and ducking", icon: Music, configKey: "stageConfigs.audioMixing", content: <AudioMixingConfig /> },
  { key: "captionGeneration", title: "Caption Generation", description: "Subtitle overlay", icon: Type, configKey: "stageConfigs.captionGeneration", defaultEnabled: false, content: <CaptionConfig /> },
  { key: "assembly", title: "Final Assembly", description: "Video compilation", icon: Clapperboard, configKey: "stageConfigs.assembly", content: <AssemblyConfig /> },
];

/** Stage panels for the Presentation pipeline */
const PRESENTATION_STAGES: StageDefinition[] = [
  { key: "pptIngestion", title: "Presentation Ingestion", description: "Parse presentation file", icon: FileText, configKey: "stageConfigs.pptIngestion", content: null },
  { key: "slideRendering", title: "Slide Rendering", description: "Capture slide images", icon: Monitor, configKey: "stageConfigs.slideRendering", content: null },
  { key: "audioScriptGen", title: "Narration Script", description: "AI narration generation", icon: Pen, configKey: "stageConfigs.audioScriptGen", content: null },
  { key: "tts", title: "Text-to-Speech", description: "Voice narration", icon: Mic, configKey: "stageConfigs.tts", content: <TtsConfig /> },
  { key: "audioMixing", title: "Audio Mixing", description: "Audio layering and ducking", icon: Music, configKey: "stageConfigs.audioMixing", content: <AudioMixingConfig /> },
  { key: "assembly", title: "Final Assembly", description: "Video compilation", icon: Clapperboard, configKey: "stageConfigs.assembly", content: <AssemblyConfig /> },
];

/** Stage panels for the Remotion pipeline */
const REMOTION_STAGES: StageDefinition[] = [
  { key: "ingestion", title: "Ingestion", description: "Content extraction settings", icon: Download, configKey: "stageConfigs.ingestion", content: <IngestionConfig /> },
  { key: "storyWriting", title: "Story Writing", description: "AI story generation", icon: Pen, configKey: "stageConfigs.storyWriting", content: <StoryWritingConfig /> },
  { key: "sceneGeneration", title: "Scene Generation", description: "Visual scene planning", icon: Layers, configKey: "stageConfigs.sceneGeneration", content: <SceneGenerationConfig /> },
  { key: "remotionComposition", title: "Remotion Composition", description: "React component generation", icon: Code, configKey: "stageConfigs.remotionComposition", content: null },
  { key: "remotionRender", title: "Remotion Render", description: "Video rendering", icon: Play, configKey: "stageConfigs.remotionRender", content: null },
];

/** Stage panels for the Motion Canvas pipeline */
const MOTION_CANVAS_STAGES: StageDefinition[] = [
  { key: "ingestion", title: "Ingestion", description: "Content extraction settings", icon: Download, configKey: "stageConfigs.ingestion", content: <IngestionConfig /> },
  { key: "storyWriting", title: "Story Writing", description: "AI story generation", icon: Pen, configKey: "stageConfigs.storyWriting", content: <StoryWritingConfig /> },
  { key: "sceneGeneration", title: "Scene Generation", description: "Visual scene planning", icon: Layers, configKey: "stageConfigs.sceneGeneration", content: <SceneGenerationConfig /> },
  { key: "motionCanvasScene", title: "Motion Canvas Scene", description: "Animation generation", icon: Code, configKey: "stageConfigs.motionCanvasScene", content: null },
  { key: "motionCanvasRender", title: "Motion Canvas Render", description: "Video rendering", icon: Play, configKey: "stageConfigs.motionCanvasRender", content: null },
];

const TEMPLATE_STAGE_MAP: Record<string, StageDefinition[]> = {
  "builtin-ai-video": AI_VIDEO_STAGES,
  "builtin-presentation": PRESENTATION_STAGES,
  "builtin-remotion": REMOTION_STAGES,
  "builtin-motion-canvas": MOTION_CANVAS_STAGES,
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  "builtin-ai-video": "Configure each stage of the AI video generation pipeline. Disable stages to skip them.",
  "builtin-presentation": "Configure the presentation-to-video pipeline stages.",
  "builtin-remotion": "Configure the Remotion video pipeline stages.",
  "builtin-motion-canvas": "Configure the Motion Canvas animation pipeline stages.",
};

export function StageConfigStep() {
  const form = useFormContext<CreateProjectInput>();
  const templateId = form.watch("pipelineTemplateId") ?? "builtin-ai-video";
  const stages = TEMPLATE_STAGE_MAP[templateId] ?? AI_VIDEO_STAGES;
  const description = TEMPLATE_DESCRIPTIONS[templateId] ?? TEMPLATE_DESCRIPTIONS["builtin-ai-video"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Configuration</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage) => (
          <StagePanel
            key={stage.key}
            title={stage.title}
            description={stage.description}
            icon={stage.icon}
            configKey={stage.configKey}
            defaultEnabled={stage.defaultEnabled}
          >
            {stage.content}
          </StagePanel>
        ))}
      </CardContent>
    </Card>
  );
}
