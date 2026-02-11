"use client";

import { useState, useEffect, startTransition } from "react";
import { Save, RotateCcw, Loader2, BookOpen } from "lucide-react";
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
import { toast } from "sonner";

interface StoryEditorProps {
  projectId: string;
}

export function StoryEditor({ projectId }: StoryEditorProps) {
  const { data: story, isLoading } = trpc.story.getByProject.useQuery({
    projectId,
  });
  const utils = trpc.useUtils();

  const [title, setTitle] = useState(story?.title ?? "");
  const [hook, setHook] = useState(story?.hook ?? "");
  const [synopsis, setSynopsis] = useState(story?.synopsis ?? "");

  useEffect(() => {
    if (story) {
      const t = story.title;
      const h = story.hook ?? "";
      const s = story.synopsis ?? "";
      startTransition(() => {
        setTitle(t);
        setHook(h);
        setSynopsis(s);
      });
    }
  }, [story]);

  const updateMutation = trpc.story.update.useMutation({
    onSuccess: () => {
      utils.story.getByProject.invalidate({ projectId });
      toast.success("Story updated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const regenerateMutation = trpc.story.regenerate.useMutation({
    onSuccess: () => {
      utils.story.getByProject.invalidate({ projectId });
      toast.success("Story regeneration started");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSave() {
    if (!story) return;
    updateMutation.mutate({
      id: story.id,
      title,
      hook,
      synopsis,
    });
  }

  function handleRegenerate() {
    regenerateMutation.mutate({ projectId });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!story) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            No story generated yet. Start the pipeline to generate a story.
          </p>
          <Button className="mt-4" onClick={handleRegenerate} disabled={regenerateMutation.isPending}>
            {regenerateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Generate Story
          </Button>
        </CardContent>
      </Card>
    );
  }

  const narrativeArc = story.narrativeArc as Record<string, string> | null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Story Editor
          </CardTitle>
          <CardDescription>
            Edit the story title, hook, and synopsis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Story title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hook">Hook</Label>
            <Textarea
              id="hook"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Attention-grabbing opening"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis">Synopsis</Label>
            <Textarea
              id="synopsis"
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Story synopsis"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {narrativeArc && Object.keys(narrativeArc).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Narrative Arc</CardTitle>
            <CardDescription>Story structure breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries(narrativeArc).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {story.scenes && story.scenes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scenes Overview</CardTitle>
            <CardDescription>
              {story.scenes.length} scene{story.scenes.length !== 1 ? "s" : ""} generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {story.scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {idx + 1}
                    </span>
                    <p className="line-clamp-1 text-sm">
                      {scene.narrationScript
                        ? scene.narrationScript.slice(0, 80) + (scene.narrationScript.length > 80 ? "..." : "")
                        : "No narration script"}
                    </p>
                  </div>
                  {scene.duration && (
                    <span className="text-xs text-muted-foreground">
                      {scene.duration}s
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
