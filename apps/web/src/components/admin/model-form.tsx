"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { createModelSchema, type CreateModelInput } from "@contenthq/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JsonEditor } from "@/components/admin/json-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelFormProps {
  model?: {
    id: string;
    providerId: string;
    name: string;
    modelId: string;
    type: string | null;
    isDefault: boolean | null;
    costs: unknown;
    capabilities: unknown;
  };
  defaultProviderId?: string;
}

export function ModelForm({ model, defaultProviderId }: ModelFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEditing = !!model;

  const { data: providers, isPending: providersLoading } =
    trpc.adminProvider.list.useQuery();

  const form = useForm<CreateModelInput>({
    resolver: zodResolver(createModelSchema),
    defaultValues: {
      providerId: model?.providerId ?? defaultProviderId ?? "",
      name: model?.name ?? "",
      modelId: model?.modelId ?? "",
      type: model?.type ?? null,
      isDefault: model?.isDefault ?? false,
      costs: (model?.costs as Record<string, unknown>) ?? null,
      capabilities: (model?.capabilities as Record<string, unknown>) ?? null,
    },
  });

  const createMutation = trpc.adminModel.create.useMutation({
    onSuccess: () => {
      utils.adminModel.list.invalidate();
      toast.success("Model created");
      router.push("/admin/models");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.adminModel.update.useMutation({
    onSuccess: () => {
      utils.adminModel.list.invalidate();
      utils.adminModel.getById.invalidate({ id: model!.id });
      toast.success("Model updated");
      router.push("/admin/models");
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: CreateModelInput) => {
    if (isEditing) {
      updateMutation.mutate({ ...data, id: model.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Model" : "New Model"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Provider</Label>
            {providersLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={form.watch("providerId")}
                onValueChange={(val) => form.setValue("providerId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.providerId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.providerId.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelId">Model ID</Label>
              <Input
                id="modelId"
                {...form.register("modelId")}
                placeholder="e.g. gpt-4o, claude-sonnet-4-5-20250929"
              />
              {form.formState.errors.modelId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.modelId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                {...form.register("type")}
                placeholder="e.g. chat, completion, embedding"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="isDefault"
                checked={form.watch("isDefault")}
                onCheckedChange={(checked) =>
                  form.setValue("isDefault", checked)
                }
              />
              <Label htmlFor="isDefault">Default Model</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Costs (JSON)</Label>
            <JsonEditor
              value={form.watch("costs") ?? null}
              onChange={(val) => form.setValue("costs", val)}
              placeholder='{\n  "input_per_1k": 0.01,\n  "output_per_1k": 0.03\n}'
            />
          </div>

          <div className="space-y-2">
            <Label>Capabilities (JSON)</Label>
            <JsonEditor
              value={form.watch("capabilities") ?? null}
              onChange={(val) => form.setValue("capabilities", val)}
              placeholder='{\n  "vision": true,\n  "function_calling": true\n}'
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Update Model"
                  : "Create Model"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/models")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
