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

interface StageJobStatusProps {
  jobs: Job[];
  stageName: string;
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

export function StageJobStatus({ jobs, stageName }: StageJobStatusProps) {
  const stageJobs = jobs.filter((j) => j.jobType === stageName);
  if (stageJobs.length === 0) return null;

  const label =
    PIPELINE_STAGE_LABELS[stageName] ?? stageName.replace(/_/g, " ").toLowerCase();

  const isMultiple = stageJobs.length > 1;
  const completedCount = stageJobs.filter((j) => j.status === "completed").length;
  const failedCount = stageJobs.filter((j) => j.status === "failed").length;
  const processingCount = stageJobs.filter((j) => j.status === "processing").length;

  if (!isMultiple) {
    const job = stageJobs[0];
    const log = getJobLog(job);

    return (
      <div className="flex items-start gap-3 rounded-md border bg-muted/30 px-3 py-2 mb-4">
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

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 mb-4">
      <div className="flex items-center gap-3">
        <div className="mt-0.5">
          {failedCount > 0 && completedCount < stageJobs.length ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : processingCount > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : completedCount === stageJobs.length ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium capitalize">{label}</p>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{stageJobs.length} done
              {failedCount > 0 && (
                <span className={cn("text-destructive ml-1")}>
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
    </div>
  );
}
