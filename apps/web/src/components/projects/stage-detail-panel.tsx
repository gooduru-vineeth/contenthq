"use client";

import { useState } from "react";
import type { PipelineStage } from "@contenthq/shared";
import { PIPELINE_STAGE_LABELS } from "@contenthq/shared";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
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
  projectStatus,
  isActive,
  jobs,
  finalVideoUrl,
  thumbnailUrl,
  totalCreditsUsed,
}: StageDetailPanelProps) {
  const label = PIPELINE_STAGE_LABELS[selectedStage] ?? selectedStage;
  const utils = trpc.useUtils();

  const retryStage = trpc.pipeline.retryStage.useMutation({
    onSuccess: () => {
      toast.success(`Regenerating ${label}`);
      void utils.pipeline.getStatus.invalidate({ projectId });
      void utils.project.getById.invalidate({ id: projectId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to regenerate stage");
    },
  });

  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const stageHasRun =
    projectStatus !== "draft" &&
    jobs.some((j) => j.jobType === selectedStage);

  const canRegenerate = stageHasRun && !isActive;

  function handleRegenerate() {
    if (!confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }
    setConfirmRegenerate(false);
    retryStage.mutate({ projectId, stage: selectedStage });
  }

  const regenerateButton = canRegenerate ? (
    <Button
      variant={confirmRegenerate ? "destructive" : "outline"}
      size="sm"
      onClick={handleRegenerate}
      onBlur={() => setConfirmRegenerate(false)}
      disabled={retryStage.isPending}
    >
      {retryStage.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4" />
      )}
      {confirmRegenerate ? "Confirm?" : "Regenerate"}
    </Button>
  ) : null;

  if (selectedStage === "VIDEO_ASSEMBLY") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{label}</CardTitle>
          {regenerateButton}
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{label}</CardTitle>
        {regenerateButton}
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
