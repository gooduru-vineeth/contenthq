"use client";

import { useState } from "react";
import { Mic, Save, Loader2, Pen, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const utils = trpc.useUtils();
  const { data: scenes, isLoading } = trpc.scene.listByProjectEnriched.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [narrationScript, setNarrationScript] = useState("");

  const updateScene = trpc.scene.update.useMutation({
    onSuccess: () => {
      toast.success("Narration script updated");
      setEditingSceneId(null);
      void utils.scene.listByProjectEnriched.invalidate({ projectId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update script");
    },
  });

  function startEditing(sceneId: string, currentScript: string) {
    setEditingSceneId(sceneId);
    setNarrationScript(currentScript);
  }

  function handleSave(sceneId: string) {
    updateScene.mutate({
      id: sceneId,
      narrationScript: narrationScript || undefined,
    });
  }

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
            const isEditing = editingSceneId === scene.id;
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
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => startEditing(scene.id, scene.narrationScript ?? "")}
                      >
                        <Pen className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor={`narration-${scene.id}`}>Narration Script</Label>
                    <Textarea
                      id={`narration-${scene.id}`}
                      value={narrationScript}
                      onChange={(e) => setNarrationScript(e.target.value)}
                      rows={3}
                      placeholder="Narration text for this scene"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(scene.id)}
                        disabled={updateScene.isPending}
                      >
                        {updateScene.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSceneId(null)}
                        disabled={updateScene.isPending}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  scene.narrationScript && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      {scene.narrationScript}
                    </p>
                  )
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
