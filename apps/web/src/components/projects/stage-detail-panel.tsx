"use client";

import type { PipelineStage } from "@contenthq/shared";
import { PIPELINE_STAGE_LABELS } from "@contenthq/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IngestionStage } from "./stages/ingestion-stage";
import { StoryWritingStage } from "./stages/story-writing-stage";
import { SceneGenerationStage } from "./stages/scene-generation-stage";
import { VisualGenerationStage } from "./stages/visual-generation-stage";
import { VisualVerificationStage } from "./stages/visual-verification-stage";
import { VideoGenerationStage } from "./stages/video-generation-stage";
import { TtsGenerationStage } from "./stages/tts-generation-stage";
import { AudioMixingStage } from "./stages/audio-mixing-stage";
import { VideoAssemblyStage } from "./stages/video-assembly-stage";

interface Job {
  id: string;
  jobType: string;
  status: string;
  createdAt: Date;
  result: Record<string, unknown> | null;
}

interface StageDetailPanelProps {
  selectedStage: PipelineStage;
  projectId: string;
  projectStatus: string;
  isActive: boolean;
  jobs: Job[];
  finalVideoUrl: string | null;
  thumbnailUrl: string | null;
  totalCreditsUsed: number;
}

const stageComponents: Record<
  string,
  React.ComponentType<{
    projectId: string;
    isActive: boolean;
    jobs: Job[];
  }>
> = {
  INGESTION: IngestionStage,
  STORY_WRITING: StoryWritingStage,
  SCENE_GENERATION: SceneGenerationStage,
  VISUAL_GENERATION: VisualGenerationStage,
  VISUAL_VERIFICATION: VisualVerificationStage,
  VIDEO_GENERATION: VideoGenerationStage,
  TTS_GENERATION: TtsGenerationStage,
  AUDIO_MIXING: AudioMixingStage,
};

export function StageDetailPanel({
  selectedStage,
  projectId,
  isActive,
  jobs,
  finalVideoUrl,
  thumbnailUrl,
  totalCreditsUsed,
}: StageDetailPanelProps) {
  const label = PIPELINE_STAGE_LABELS[selectedStage] ?? selectedStage;

  if (selectedStage === "VIDEO_ASSEMBLY") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoAssemblyStage
            projectId={projectId}
            isActive={isActive}
            jobs={jobs}
            finalVideoUrl={finalVideoUrl}
            thumbnailUrl={thumbnailUrl}
            totalCreditsUsed={totalCreditsUsed}
          />
        </CardContent>
      </Card>
    );
  }

  const StageComponent = stageComponents[selectedStage];
  if (!StageComponent) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <StageComponent
          projectId={projectId}
          isActive={isActive}
          jobs={jobs}
        />
      </CardContent>
    </Card>
  );
}
