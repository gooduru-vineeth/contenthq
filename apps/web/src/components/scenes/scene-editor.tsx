"use client";

import { useState, useEffect, startTransition } from "react";
import { Save, Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VisualPreview } from "./visual-preview";
import { useSceneStore } from "@/store/scene-store";
import { toast } from "sonner";

interface SceneVisual {
  id: string;
  imageUrl: string | null;
  verified: boolean | null;
  verificationScore: number | null;
}

interface Scene {
  id: string;
  projectId: string;
  index: number;
  status: string;
  visualDescription: string | null;
  imagePrompt: string | null;
  narrationScript: string | null;
  duration: number | null;
  visuals?: SceneVisual[];
}

interface SceneEditorProps {
  scene: Scene;
  projectId: string;
}

export function SceneEditor({ scene, projectId }: SceneEditorProps) {
  const { setSelectedScene } = useSceneStore();
  const utils = trpc.useUtils();

  const [visualDescription, setVisualDescription] = useState(scene.visualDescription ?? "");
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt ?? "");
  const [narrationScript, setNarrationScript] = useState(scene.narrationScript ?? "");
  const [duration, setDuration] = useState(scene.duration ?? 5);

  useEffect(() => {
    const vd = scene.visualDescription ?? "";
    const ip = scene.imagePrompt ?? "";
    const ns = scene.narrationScript ?? "";
    const d = scene.duration ?? 5;
    startTransition(() => {
      setVisualDescription(vd);
      setImagePrompt(ip);
      setNarrationScript(ns);
      setDuration(d);
    });
  }, [scene.id, scene.visualDescription, scene.imagePrompt, scene.narrationScript, scene.duration]);

  const updateMutation = trpc.scene.update.useMutation({
    onSuccess: () => {
      utils.scene.listByProject.invalidate({ projectId });
      toast.success("Scene updated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const regenerateVisualMutation = trpc.scene.regenerateVisual.useMutation({
    onSuccess: () => {
      utils.scene.listByProject.invalidate({ projectId });
      toast.success("Visual regeneration started");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSave() {
    updateMutation.mutate({
      id: scene.id,
      visualDescription,
      imagePrompt,
      narrationScript,
      duration,
    });
  }

  function handleRegenerateVisual() {
    regenerateVisualMutation.mutate({
      sceneId: scene.id,
      projectId,
    });
  }

  const activeVisual = scene.visuals?.find((v) => v.imageUrl) ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Editing Scene {scene.index + 1}
            </CardTitle>
            <CardDescription>
              Modify scene details and regenerate visuals
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedScene(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual preview */}
        <div className="space-y-2">
          <Label>Visual Preview</Label>
          <VisualPreview
            imageUrl={activeVisual?.imageUrl ?? null}
            verified={activeVisual?.verified ?? null}
            verificationScore={activeVisual?.verificationScore ?? null}
            onRegenerate={handleRegenerateVisual}
            isRegenerating={regenerateVisualMutation.isPending}
          />
        </div>

        {/* Visual description */}
        <div className="space-y-2">
          <Label htmlFor="visualDescription">Visual Description</Label>
          <Textarea
            id="visualDescription"
            value={visualDescription}
            onChange={(e) => setVisualDescription(e.target.value)}
            placeholder="Describe the visual elements of this scene"
            rows={3}
          />
        </div>

        {/* Image prompt */}
        <div className="space-y-2">
          <Label htmlFor="imagePrompt">Image Prompt</Label>
          <Textarea
            id="imagePrompt"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="AI image generation prompt"
            rows={3}
          />
        </div>

        {/* Narration script */}
        <div className="space-y-2">
          <Label htmlFor="narrationScript">Narration Script</Label>
          <Textarea
            id="narrationScript"
            value={narrationScript}
            onChange={(e) => setNarrationScript(e.target.value)}
            placeholder="Voice-over narration text"
            rows={4}
          />
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            id="duration"
            type="number"
            min={1}
            max={120}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>

        {/* Actions */}
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Scene
        </Button>
      </CardContent>
    </Card>
  );
}

export function SceneEditorSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
