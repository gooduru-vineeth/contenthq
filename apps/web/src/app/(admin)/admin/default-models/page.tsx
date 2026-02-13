"use client";

import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PURPOSE_TYPES = [
  {
    value: "llm",
    label: "Language Model (LLM)",
    description: "Used for story writing, scene generation, and text tasks",
  },
  {
    value: "image",
    label: "Image Generation",
    description: "Used for generating scene visuals",
  },
  {
    value: "vision",
    label: "Vision / Verification",
    description: "Used for visual quality verification",
  },
  {
    value: "video",
    label: "Video Generation",
    description: "Used for AI video generation",
  },
  {
    value: "tts",
    label: "Text-to-Speech",
    description: "Used for narration and voiceover generation",
  },
] as const;

export default function DefaultModelsPage() {
  const utils = trpc.useUtils();
  const { data: defaults, isPending: defaultsLoading } =
    trpc.adminModel.getDefaults.useQuery();
  const { data: allModels, isPending: modelsLoading } =
    trpc.adminModel.list.useQuery();

  const toggleMutation = trpc.adminModel.toggleDefault.useMutation({
    onSuccess: () => {
      utils.adminModel.getDefaults.invalidate();
      utils.adminModel.list.invalidate();
      toast.success("Default model updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = defaultsLoading || modelsLoading;

  const getDefaultForType = (type: string) => {
    if (!defaults) return null;
    return defaults.find(
      (d: { type: string | null }) => d.type === type
    );
  };

  const getModelsForType = (type: string) => {
    if (!allModels) return [];
    return (allModels as Array<{ id: string; name: string; type: string | null; modelId: string; providerName: string | null }>).filter(
      (m) => m.type === type
    );
  };

  const handleChange = (_type: string, modelId: string) => {
    // The backend handles unsetting the old default for the same type when setting a new one
    toggleMutation.mutate({ id: modelId, isDefault: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Default Models</h2>
        <p className="text-muted-foreground">
          Configure the default AI model for each purpose type across the
          platform.
        </p>
      </div>

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PURPOSE_TYPES.map((pt) => (
            <Skeleton key={pt.value} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PURPOSE_TYPES.map((pt) => {
            const current = getDefaultForType(pt.value);
            const models = getModelsForType(pt.value);

            return (
              <Card key={pt.value}>
                <CardHeader>
                  <CardTitle className="text-base">{pt.label}</CardTitle>
                  <CardDescription>{pt.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {current ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{current.name}</Badge>
                      {current.providerSlug && (
                        <Badge variant="outline">{current.providerSlug}</Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="destructive">No default set</Badge>
                  )}

                  <Select
                    value={current?.id ?? ""}
                    onValueChange={(value) => handleChange(pt.value, value)}
                    disabled={toggleMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No models of this type
                        </SelectItem>
                      ) : (
                        models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                            {m.providerName ? ` (${m.providerName})` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
