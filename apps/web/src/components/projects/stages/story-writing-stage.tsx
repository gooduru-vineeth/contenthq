"use client";

import { useState } from "react";
import Link from "next/link";
import { Pen, FileText, Save, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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

interface StoryWritingStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
}

export function StoryWritingStage({ projectId, isActive, jobs }: StoryWritingStageProps) {
  const utils = trpc.useUtils();
  const { data: story, isLoading } = trpc.story.getByProject.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [synopsis, setSynopsis] = useState("");

  const updateStory = trpc.story.update.useMutation({
    onSuccess: () => {
      toast.success("Story updated");
      setIsEditing(false);
      void utils.story.getByProject.invalidate({ projectId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update story");
    },
  });

  function startEditing() {
    if (!story) return;
    setTitle(story.title ?? "");
    setHook(story.hook ?? "");
    setSynopsis(story.synopsis ?? "");
    setIsEditing(true);
  }

  function handleSave() {
    if (!story) return;
    updateStory.mutate({
      id: story.id,
      title: title || undefined,
      hook: hook || undefined,
      synopsis: synopsis || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="STORY_WRITING" />
      {!story ? (
        <StageEmptyState
          icon={Pen}
          title={isActive ? "Writing story..." : "No story generated"}
          description={
            isActive
              ? "AI is crafting a narrative structure with scenes"
              : "The story will be generated after content ingestion."
          }
          isActive={isActive}
        />
      ) : isEditing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="story-title">Title</Label>
            <Input
              id="story-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Story title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="story-hook">Hook</Label>
            <Textarea
              id="story-hook"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Opening hook"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="story-synopsis">Synopsis</Label>
            <Textarea
              id="story-synopsis"
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Story synopsis"
              rows={4}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateStory.isPending}
            >
              {updateStory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={updateStory.isPending}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold">{story.title}</p>
            {story.hook && (
              <p className="mt-1 text-sm text-muted-foreground italic">
                {story.hook}
              </p>
            )}
          </div>
          {story.synopsis && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Synopsis
              </p>
              <p className="text-sm">{story.synopsis}</p>
            </div>
          )}
          {story.scenes && story.scenes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {story.scenes.length} scene{story.scenes.length !== 1 ? "s" : ""} generated
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pen className="h-4 w-4" /> Edit Inline
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/story`}>
                <FileText className="h-4 w-4" /> Full Editor
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
