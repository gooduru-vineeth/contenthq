"use client";

import { Music } from "lucide-react";
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

interface AudioMixingStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
}

export function AudioMixingStage({ projectId, isActive, jobs }: AudioMixingStageProps) {
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

  const hasAudioMixes = scenes?.some(
    (s) => s.audioMixes && s.audioMixes.length > 0,
  );

  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="AUDIO_MIXING" />
      {!scenes || scenes.length === 0 || !hasAudioMixes ? (
        <StageEmptyState
          icon={Music}
          title={isActive ? "Mixing audio..." : "No audio mixed"}
          description={
            isActive
              ? "Mixing voiceover with background music"
              : "Audio mixing combines voiceover and background music."
          }
          isActive={isActive}
        />
      ) : (
        <div className="space-y-3">
          {scenes.map((scene) => {
            const mix = scene.audioMixes?.[0];
            if (!mix) return null;
            return (
              <div
                key={scene.id}
                className="rounded-md border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Scene {scene.index + 1}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Voice: {mix.voiceoverVolume ?? 100}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Music: {mix.musicVolume ?? 30}%
                    </span>
                    {mix.musicDuckingEnabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        Ducking
                      </Badge>
                    )}
                  </div>
                </div>
                {mix.mixedAudioUrl ? (
                  <audio
                    src={mix.mixedAudioUrl}
                    controls
                    className="w-full h-8"
                    preload="metadata"
                  />
                ) : (
                  <div className="flex h-12 items-center justify-center rounded-md bg-muted">
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
