"use client";

import { use, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  ScrollText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PipelineProgressTracker } from "@/components/projects/pipeline-tracker";
import { PipelineLog } from "@/components/projects/pipeline-log";
import { StageDetailPanel } from "@/components/projects/stage-detail-panel";
import {
  PROJECT_STATUS_TO_STAGE,
  type PipelineStage,
} from "@contenthq/shared";

const PIPELINE_TEMPLATE_LABELS: Record<string, string> = {
  "builtin-ai-video": "AI Video",
  "builtin-presentation": "Presentation Video",
  "builtin-remotion": "Remotion Video",
  "builtin-motion-canvas": "Motion Canvas Video",
};

const statusBadgeVariant: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  draft: "secondary",
  completed: "default",
  failed: "destructive",
};

const statusBadgeClass: Record<string, string> = {
  completed: "bg-green-500 hover:bg-green-500/80",
};

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const utils = trpc.useUtils();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isActive = (status: string) =>
    !["draft", "completed", "failed", "cancelled"].includes(status);

  const { data: project, isLoading: projectLoading } =
    trpc.project.getById.useQuery(
      { id },
      {
        enabled: !isDeleting,
        refetchInterval: (query) =>
          isDeleting ? false : isActive(query.state.data?.status ?? "draft") ? 5000 : false,
      },
    );

  const isProjectActive = project ? isActive(project.status) : false;

  const { data: jobs } = trpc.job.getLogsByProject.useQuery(
    { projectId: id },
    {
      enabled: !isDeleting,
      refetchInterval: isDeleting ? false : isProjectActive ? 5000 : false,
    },
  );

  const currentStage = project
    ? PROJECT_STATUS_TO_STAGE[project.status] ?? null
    : null;

  // User-overridden stage selection (null = follow pipeline automatically)
  const [userSelectedStage, setUserSelectedStage] = useState<PipelineStage | null>(null);
  const prevCurrentStageRef = useRef(currentStage);

  // When pipeline advances to a new stage, clear user selection so it auto-follows
  if (currentStage !== prevCurrentStageRef.current) {
    prevCurrentStageRef.current = currentStage;
    if (userSelectedStage !== null) {
      setUserSelectedStage(null);
    }
  }

  // Derive the displayed stage: user pick > current pipeline stage > sensible default
  const selectedStage: PipelineStage | null =
    userSelectedStage ??
    (project?.status === "completed"
      ? ("VIDEO_ASSEMBLY" as PipelineStage)
      : currentStage ?? ("INGESTION" as PipelineStage));

  function handleStageSelect(stage: PipelineStage) {
    setUserSelectedStage(stage);
  }

  const startPipelineMutation = trpc.pipeline.start.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id });
      setUserSelectedStage(null);
    },
  });
  const deleteMutation = trpc.project.delete.useMutation({
    onMutate: () => {
      setIsDeleting(true);
    },
    onSuccess: () => {
      utils.project.list.invalidate();
      router.push("/projects");
    },
    onError: () => {
      setIsDeleting(false);
    },
  });

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Project not found</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  const canStart = project.status === "draft";
  const canRetry = project.status === "failed";

  function handleStartPipeline() {
    startPipelineMutation.mutate({ projectId: id });
  }

  function handleDelete() {
    setShowDeleteDialog(true);
  }

  function confirmDelete() {
    setShowDeleteDialog(false);
    deleteMutation.mutate({ id });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {project.title}
              </h1>
              <Badge
                variant={statusBadgeVariant[project.status] ?? "outline"}
                className={statusBadgeClass[project.status] ?? ""}
              >
                {project.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant="outline">
                {PIPELINE_TEMPLATE_LABELS[project.pipelineTemplateId ?? "builtin-ai-video"] ?? "AI Video"}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatFullDate(project.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {project.targetDuration}s target
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canStart && (
            <Button
              onClick={handleStartPipeline}
              disabled={startPipelineMutation.isPending}
            >
              {startPipelineMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Pipeline
            </Button>
          )}
          {canRetry && (
            <Button
              variant="outline"
              onClick={handleStartPipeline}
              disabled={startPipelineMutation.isPending}
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Pipeline Progress */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Pipeline Progress</CardTitle>
              <CardDescription>
                {PIPELINE_TEMPLATE_LABELS[project.pipelineTemplateId ?? "builtin-ai-video"] ?? "AI Video"} pipeline — click a stage to view details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PipelineProgressTracker
            currentStage={currentStage}
            projectStatus={project.status}
            progressPercent={project.progressPercent ?? undefined}
            selectedStage={selectedStage}
            onStageSelect={handleStageSelect}
            pipelineTemplateId={project.pipelineTemplateId}
          />
        </CardContent>
      </Card>

      {/* Stage Detail Panel */}
      {selectedStage && (
        <StageDetailPanel
          selectedStage={selectedStage}
          projectId={id}
          projectStatus={project.status}
          isActive={isProjectActive}
          jobs={(jobs ?? []) as Parameters<typeof StageDetailPanel>[0]["jobs"]}
          finalVideoUrl={project.finalVideoUrl}
          thumbnailUrl={project.thumbnailUrl}
          totalCreditsUsed={project.totalCreditsUsed ?? 0}
        />
      )}

      {/* Pipeline Log — collapsible accordion */}
      <Accordion type="single" collapsible>
        <AccordionItem value="pipeline-log" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              <span className="text-sm font-medium">Pipeline Log</span>
              {jobs && jobs.length > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {jobs.length}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PipelineLog jobs={(jobs ?? []) as Parameters<typeof PipelineLog>[0]["jobs"]} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              {isProjectActive
                ? "This project has an active pipeline running. Deleting it will cancel all in-progress jobs and remove all generated content. This action cannot be undone."
                : "This will permanently delete the project and all its generated content. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
