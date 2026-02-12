"use client";

import { use } from "react";
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
  FileText,
  Image as ImageIcon,
  Layers,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PipelineProgress } from "@/components/projects/pipeline-progress";
import { PipelineLog } from "@/components/projects/pipeline-log";
import {
  PROJECT_STATUS_TO_STAGE,
} from "@contenthq/shared";

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

  const isActive = (status: string) =>
    !["draft", "completed", "failed", "cancelled"].includes(status);

  const { data: project, isLoading: projectLoading } =
    trpc.project.getById.useQuery(
      { id },
      { refetchInterval: (query) => isActive(query.state.data?.status ?? "draft") ? 3000 : false },
    );

  const isProjectActive = project ? isActive(project.status) : false;

  const { data: story } = trpc.story.getByProject.useQuery(
    { projectId: id },
  );
  const { data: jobs } = trpc.job.getLogsByProject.useQuery(
    { projectId: id },
    { refetchInterval: isProjectActive ? 3000 : false },
  );
  const { data: scenes } = trpc.scene.listByProject.useQuery(
    { projectId: id },
    { refetchInterval: isProjectActive ? 5000 : false },
  );

  const startPipelineMutation = trpc.pipeline.start.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id });
    },
  });
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      router.push("/projects");
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

  const currentStage = PROJECT_STATUS_TO_STAGE[project.status] ?? null;
  const canStart = project.status === "draft";
  const canRetry = project.status === "failed";

  function handleStartPipeline() {
    startPipelineMutation.mutate({ projectId: id });
  }

  function handleDelete() {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Progress</CardTitle>
          <CardDescription>
            {project.progressPercent}% complete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineProgress
            currentStage={currentStage}
            projectStatus={project.status}
            progressPercent={project.progressPercent ?? undefined}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${id}/story`}>
            <FileText className="h-4 w-4" /> Edit Story
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${id}/scenes`}>
            <ImageIcon className="h-4 w-4" /> View Scenes
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Story Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Story
            </CardTitle>
          </CardHeader>
          <CardContent>
            {story ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{story.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {story.hook}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Synopsis
                  </p>
                  <p className="mt-1 text-sm">{story.synopsis}</p>
                </div>
                {story.scenes && story.scenes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {story.scenes.length} scene
                      {story.scenes.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No story generated yet. Start the pipeline to generate a story.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Log</CardTitle>
            <CardDescription>Stage execution details</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineLog jobs={(jobs ?? []) as Parameters<typeof PipelineLog>[0]["jobs"]} />
          </CardContent>
        </Card>
      </div>

      {/* Scenes Preview */}
      {scenes && scenes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Scenes ({scenes.length})
            </CardTitle>
            <CardDescription>
              Scene thumbnails and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {scenes.map((scene) => {
                const visual = scene.visuals?.[0];
                return (
                  <div
                    key={scene.id}
                    className="group relative overflow-hidden rounded-md border"
                  >
                    {visual?.imageUrl ? (
                      <img
                        src={visual.imageUrl}
                        alt={scene.visualDescription ?? `Scene ${scene.index + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs font-medium text-white">
                        Scene {scene.index + 1}
                      </p>
                      <Badge
                        variant="secondary"
                        className="mt-0.5 text-[9px] bg-black/50 text-white border-0"
                      >
                        {scene.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
