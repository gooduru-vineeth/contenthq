"use client";

import Link from "next/link";
import { Pen, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
  const { data: story, isLoading } = trpc.story.getByProject.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

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
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${projectId}/story`}>
              <FileText className="h-4 w-4" /> Edit Story
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
