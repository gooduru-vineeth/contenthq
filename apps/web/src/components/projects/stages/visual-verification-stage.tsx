"use client";

import Image from "next/image";
import { ShieldCheck, Check, X, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StageEmptyState } from "./stage-empty-state";
import { StageJobStatus } from "./stage-job-status";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  jobType: string;
  status: string;
  createdAt: Date;
  result: Record<string, unknown> | null;
}

interface VerificationDetails {
  relevance?: number;
  quality?: number;
  consistency?: number;
  safety?: number;
}

interface VisualVerificationStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500",
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function VisualVerificationStage({ projectId, isActive, jobs }: VisualVerificationStageProps) {
  const { data: scenes, isLoading } = trpc.scene.listByProject.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const hasVisuals = scenes?.some((s) => s.visuals && s.visuals.length > 0);

  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="VISUAL_VERIFICATION" />
      {!scenes || scenes.length === 0 || !hasVisuals ? (
        <StageEmptyState
          icon={ShieldCheck}
          title={isActive ? "Verifying visuals..." : "No visuals to verify"}
          description={
            isActive
              ? "AI is checking visual quality and relevance"
              : "Visual verification happens after image generation."
          }
          isActive={isActive}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {scenes.map((scene) => {
            const visual = scene.visuals?.[0];
            if (!visual) return null;
            const details = (visual.verificationDetails ?? {}) as VerificationDetails;
            const isVerified = visual.verified;
            const score = visual.verificationScore;

            return (
              <div
                key={scene.id}
                className="rounded-md border overflow-hidden"
              >
                {visual.imageUrl ? (
                  <div className="relative aspect-video w-full">
                    <Image
                      src={visual.imageUrl}
                      alt={`Scene ${scene.index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute top-2 right-2">
                      {isVerified ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
                          <X className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Scene {scene.index + 1}</p>
                    {score != null && (
                      <Badge
                        variant={isVerified ? "default" : "destructive"}
                        className={cn(
                          "text-[10px]",
                          isVerified && "bg-green-500 hover:bg-green-500/80",
                        )}
                      >
                        {score}%
                      </Badge>
                    )}
                  </div>
                  {(details.relevance != null || details.quality != null || details.consistency != null || details.safety != null) && (
                    <div className="space-y-1">
                      {details.relevance != null && (
                        <ScoreBar label="Relevance" value={details.relevance} />
                      )}
                      {details.quality != null && (
                        <ScoreBar label="Quality" value={details.quality} />
                      )}
                      {details.consistency != null && (
                        <ScoreBar label="Consistency" value={details.consistency} />
                      )}
                      {details.safety != null && (
                        <ScoreBar label="Safety" value={details.safety} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
