"use client";

import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGE_LABELS } from "@contenthq/shared";

interface JobLog {
  stage: string;
  status: "completed" | "failed";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  details?: string;
  error?: string;
}

interface Job {
  id: string;
  jobType: string;
  status: string;
  createdAt: Date;
  result: Record<string, unknown> | null;
}

interface PipelineLogProps {
  jobs: Job[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getJobLog(job: Job): JobLog | null {
  const result = job.result as Record<string, unknown> | null;
  if (!result?.log) return null;
  return result.log as JobLog;
}

export function PipelineLog({ jobs }: PipelineLogProps) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pipeline activity yet.
      </p>
    );
  }

  // Group jobs by type, keeping order
  const grouped = new Map<string, Job[]>();
  for (const job of jobs) {
    const existing = grouped.get(job.jobType) ?? [];
    existing.push(job);
    grouped.set(job.jobType, existing);
  }

  return (
    <div className="space-y-1.5">
      {Array.from(grouped.entries()).map(([jobType, groupJobs]) => {
        const isMultiple = groupJobs.length > 1;
        const { completedCount, failedCount, processingCount } = groupJobs.reduce(
          (acc, j) => {
            if (j.status === "completed") acc.completedCount++;
            else if (j.status === "failed") acc.failedCount++;
            else if (j.status === "processing") acc.processingCount++;
            return acc;
          },
          { completedCount: 0, failedCount: 0, processingCount: 0 }
        );
        const label =
          PIPELINE_STAGE_LABELS[jobType] ?? jobType.replace(/_/g, " ").toLowerCase();

        // For single jobs, show detailed view
        if (!isMultiple) {
          const job = groupJobs[0];
          const log = getJobLog(job);

          return (
            <div
              key={job.id}
              className="flex items-start gap-3 rounded-md border px-3 py-2"
            >
              <div className="mt-0.5">
                {job.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : job.status === "failed" ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : job.status === "processing" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize">{label}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {log?.durationMs != null && (
                      <span>{formatDuration(log.durationMs)}</span>
                    )}
                    <span>{formatTime(job.createdAt)}</span>
                  </div>
                </div>
                {log?.details && job.status === "completed" && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {log.details}
                  </p>
                )}
                {log?.error && job.status === "failed" && (
                  <p className="text-xs text-destructive mt-0.5 truncate">
                    {log.error}
                  </p>
                )}
                {job.status === "processing" && (
                  <p className="text-xs text-primary mt-0.5 animate-pulse">
                    Processing...
                  </p>
                )}
              </div>
            </div>
          );
        }

        // For multiple jobs of same type, show a summary row
        return (
          <div
            key={jobType}
            className="rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <div className="mt-0.5">
                {failedCount > 0 && completedCount < groupJobs.length ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : processingCount > 0 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : completedCount === groupJobs.length ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium capitalize">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {completedCount}/{groupJobs.length} done
                    {failedCount > 0 && (
                      <span className="text-destructive ml-1">
                        ({failedCount} failed)
                      </span>
                    )}
                  </p>
                </div>
                {processingCount > 0 && (
                  <p className="text-xs text-primary mt-0.5 animate-pulse">
                    {processingCount} processing...
                  </p>
                )}
              </div>
            </div>
            {/* Show individual failed jobs inline */}
            {groupJobs
              .filter((j) => j.status === "failed")
              .map((job) => {
                const log = getJobLog(job);
                return log?.error ? (
                  <p
                    key={job.id}
                    className={cn("text-xs text-destructive mt-1 pl-7 truncate")}
                  >
                    {log.error}
                  </p>
                ) : null;
              })}
          </div>
        );
      })}
    </div>
  );
}
