"use client";

import { Download, ExternalLink } from "lucide-react";
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

interface IngestionStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
}

export function IngestionStage({ projectId, isActive, jobs }: IngestionStageProps) {
  const { data: ingestions, isLoading } = trpc.ingestion.getByProject.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="INGESTION" />
      {!ingestions || ingestions.length === 0 ? (
        <StageEmptyState
          icon={Download}
          title={isActive ? "Ingesting content..." : "No content ingested"}
          description={
            isActive
              ? "Extracting and analyzing content from source"
              : "Start the pipeline to ingest content from the configured source."
          }
          isActive={isActive}
        />
      ) : (
        <div className="space-y-3">
          {ingestions.map((item) => (
            <div
              key={item.id}
              className="rounded-md border p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {item.title || "Untitled Content"}
                  </p>
                  {item.sourcePlatform && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {item.sourcePlatform}
                    </Badge>
                  )}
                </div>
                {item.engagementScore != null && item.engagementScore > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Engagement</p>
                    <p className="text-sm font-medium">{item.engagementScore}</p>
                  </div>
                )}
              </div>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {item.sourceUrl}
                </a>
              )}
              {item.body && (
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {item.body}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
