"use client";

import { Mic } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StageEmptyState } from "./stage-empty-state";
import { StageJobStatus } from "./stage-job-status";

interface Job {
  id: string;
  jobType: string;
  status: string;
  createdAt: Date;
  result: Record<string, unknown> | null;
}

interface TtsGenerationStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
}

export function TtsGenerationStage({ projectId, isActive, jobs }: TtsGenerationStageProps) {
  const { data: scenes, isLoading } = trpc.scene.listByProjectEnriched.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const hasVoiceovers = scenes?.some(
    (s) => s.videos?.some((v) => v.voiceoverUrl),
  );

  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="TTS_GENERATION" />
      {!scenes || scenes.length === 0 || !hasVoiceovers ? (
        <StageEmptyState
          icon={Mic}
          title={isActive ? "Generating voiceovers..." : "No voiceovers generated"}
          description={
            isActive
              ? "Converting narration scripts to speech"
              : "Voice generation happens after video creation."
          }
          isActive={isActive}
        />
      ) : (
        <div className="space-y-3">
          {scenes.map((scene) => {
            const video = scene.videos?.[0];
            if (!video?.voiceoverUrl) return null;
            return (
              <div
                key={scene.id}
                className="rounded-md border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Scene {scene.index + 1}</p>
                  <div className="flex items-center gap-2">
                    {video.ttsProvider && (
                      <Badge variant="secondary" className="text-[10px]">
                        {video.ttsProvider}
                      </Badge>
                    )}
                    {video.ttsVoiceId && (
                      <span className="text-xs text-muted-foreground">
                        {video.ttsVoiceId}
                      </span>
                    )}
                  </div>
                </div>
                {scene.narrationScript && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    {scene.narrationScript}
                  </p>
                )}
                <audio
                  src={video.voiceoverUrl}
                  controls
                  className="w-full h-8"
                  preload="metadata"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
