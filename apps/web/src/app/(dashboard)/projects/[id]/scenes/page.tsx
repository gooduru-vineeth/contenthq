"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SceneCard } from "@/components/scenes/scene-card";
import { SceneEditor } from "@/components/scenes/scene-editor";
import { SceneTimeline } from "@/components/scenes/scene-timeline";
import { useSceneStore } from "@/store/scene-store";

export default function ScenesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { selectedSceneId } = useSceneStore();

  const { data: scenes, isLoading } = trpc.scene.listByProject.useQuery({
    projectId: id,
  });

  const selectedScene = scenes?.find((s) => s.id === selectedSceneId) ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <h1 className="text-2xl font-bold tracking-tight">Scenes</h1>
          {scenes && (
            <span className="text-sm text-muted-foreground">
              ({scenes.length} scene{scenes.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !scenes || scenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Layers className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            No scenes generated yet. Generate a story first to create scenes.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href={`/projects/${id}/story`}>Go to Story Editor</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Scene cards grid */}
          <div className={selectedScene ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {scenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  id={scene.id}
                  index={scene.index}
                  status={scene.status}
                  narrationScript={scene.narrationScript}
                  visualDescription={scene.visualDescription}
                  duration={scene.duration}
                  visuals={scene.visuals}
                />
              ))}
            </div>
          </div>

          {/* Scene editor panel */}
          {selectedScene && (
            <div className="lg:col-span-1">
              <SceneEditor key={selectedScene.id} scene={selectedScene} projectId={id} />
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {scenes && scenes.length > 0 && <SceneTimeline scenes={scenes} />}
    </div>
  );
}
