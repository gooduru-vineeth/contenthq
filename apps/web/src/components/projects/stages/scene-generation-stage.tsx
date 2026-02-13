"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, ImageIcon, Save, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface SceneGenerationStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
}

const statusColors: Record<string, string> = {
  outlined: "bg-muted text-muted-foreground",
  scripted: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  visual_generated: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  visual_verified: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  video_generated: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  audio_mixed: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

interface SceneEditState {
  visualDescription: string;
  narrationScript: string;
  duration: string;
}

export function SceneGenerationStage({ projectId, isActive, jobs }: SceneGenerationStageProps) {
  const utils = trpc.useUtils();
  const { data: scenes, isLoading } = trpc.scene.listByProject.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);
  const [editState, setEditState] = useState<SceneEditState>({
    visualDescription: "",
    narrationScript: "",
    duration: "",
  });

  const updateScene = trpc.scene.update.useMutation({
    onSuccess: () => {
      toast.success("Scene updated");
      setExpandedSceneId(null);
      void utils.scene.listByProject.invalidate({ projectId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update scene");
    },
  });

  function toggleScene(sceneId: string, scene: { visualDescription: string | null; narrationScript: string | null; duration: number | null }) {
    if (expandedSceneId === sceneId) {
      setExpandedSceneId(null);
      return;
    }
    setExpandedSceneId(sceneId);
    setEditState({
      visualDescription: scene.visualDescription ?? "",
      narrationScript: scene.narrationScript ?? "",
      duration: scene.duration?.toString() ?? "",
    });
  }

  function handleSave(sceneId: string) {
    updateScene.mutate({
      id: sceneId,
      visualDescription: editState.visualDescription || undefined,
      narrationScript: editState.narrationScript || undefined,
      duration: editState.duration ? parseInt(editState.duration, 10) : undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="SCENE_GENERATION" />
      {!scenes || scenes.length === 0 ? (
        <StageEmptyState
          icon={Layers}
          title={isActive ? "Generating scenes..." : "No scenes yet"}
          description={
            isActive
              ? "Breaking the story into visual scenes with descriptions"
              : "Scenes will be generated from the story."
          }
          isActive={isActive}
        />
      ) : (
        <div className="space-y-3">
          <div className="divide-y rounded-md border">
            {scenes.map((scene) => (
              <div key={scene.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggleScene(scene.id, scene)}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {scene.index + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={statusColors[scene.status] ?? "text-[10px]"}
                      >
                        {scene.status.replace(/_/g, " ")}
                      </Badge>
                      {scene.duration != null && (
                        <span className="text-xs text-muted-foreground">
                          {scene.duration}s
                        </span>
                      )}
                    </div>
                    {scene.visualDescription && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {scene.visualDescription}
                      </p>
                    )}
                    {scene.narrationScript && (
                      <p className="text-xs italic text-muted-foreground/70 line-clamp-1">
                        {scene.narrationScript}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 pt-1">
                    {expandedSceneId === scene.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedSceneId === scene.id && (
                  <div className="border-t bg-muted/30 p-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`scene-vis-${scene.id}`}>Visual Description</Label>
                      <Textarea
                        id={`scene-vis-${scene.id}`}
                        value={editState.visualDescription}
                        onChange={(e) =>
                          setEditState((s) => ({ ...s, visualDescription: e.target.value }))
                        }
                        rows={3}
                        placeholder="Describe the visual for this scene"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`scene-narr-${scene.id}`}>Narration Script</Label>
                      <Textarea
                        id={`scene-narr-${scene.id}`}
                        value={editState.narrationScript}
                        onChange={(e) =>
                          setEditState((s) => ({ ...s, narrationScript: e.target.value }))
                        }
                        rows={3}
                        placeholder="Narration text for this scene"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`scene-dur-${scene.id}`}>Duration (seconds)</Label>
                      <Input
                        id={`scene-dur-${scene.id}`}
                        type="number"
                        min={1}
                        max={120}
                        value={editState.duration}
                        onChange={(e) =>
                          setEditState((s) => ({ ...s, duration: e.target.value }))
                        }
                        placeholder="5"
                      />
                    </div>
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
                        onClick={() => setExpandedSceneId(null)}
                        disabled={updateScene.isPending}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${projectId}/scenes`}>
              <ImageIcon className="h-4 w-4" /> View All Scenes
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
