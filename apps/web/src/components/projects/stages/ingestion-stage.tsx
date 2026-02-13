"use client";

import { useState } from "react";
import { Download, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
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

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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
          {ingestions.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const hasLongBody = item.body && item.body.length > 200;
            return (
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
                  <div>
                    <p
                      className={`text-xs text-muted-foreground whitespace-pre-wrap ${
                        isExpanded ? "" : "line-clamp-3"
                      }`}
                    >
                      {item.body}
                    </p>
                    {hasLongBody && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-auto p-0 text-xs text-primary"
                        onClick={() => toggleExpand(item.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Show full content
                          </>
                        )}
                      </Button>
                    )}
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
