"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import {
  createProviderSchema,
  type CreateProviderInput,
} from "@contenthq/shared";
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

const PROVIDER_TYPES = [
  "llm",
  "image",
  "video",
  "tts",
  "music",
  "vision",
  "embedding",
] as const;

interface ProviderFormProps {
  provider?: {
    id: string;
    name: string;
    slug: string;
    type: (typeof PROVIDER_TYPES)[number];
    isEnabled: boolean | null;
    rateLimitPerMinute: number | null;
    costPerUnit: string | null;
    config: unknown;
  };
}

export function ProviderForm({ provider }: ProviderFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEditing = !!provider;

  const form = useForm<CreateProviderInput>({
    resolver: zodResolver(createProviderSchema),
    defaultValues: {
      name: provider?.name ?? "",
      slug: provider?.slug ?? "",
      type: provider?.type ?? "llm",
      isEnabled: provider?.isEnabled ?? true,
      rateLimitPerMinute: provider?.rateLimitPerMinute ?? null,
      costPerUnit: provider?.costPerUnit ?? null,
      config: (provider?.config as Record<string, unknown>) ?? null,
    },
  });

  const createMutation = trpc.adminProvider.create.useMutation({
    onSuccess: () => {
      utils.adminProvider.list.invalidate();
      toast.success("Provider created");
      router.push("/admin/providers");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.adminProvider.update.useMutation({
    onSuccess: () => {
      utils.adminProvider.list.invalidate();
      utils.adminProvider.getById.invalidate({ id: provider!.id });
      toast.success("Provider updated");
      router.push("/admin/providers");
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: CreateProviderInput) => {
    if (isEditing) {
      updateMutation.mutate({ ...data, id: provider.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const watchedType = useWatch({ control: form.control, name: "type" });
  const watchedIsEnabled = useWatch({ control: form.control, name: "isEnabled" });
  const watchedConfig = useWatch({ control: form.control, name: "config" });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue("name", name);
    if (!isEditing) {
      form.setValue(
        "slug",
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Provider" : "New Provider"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                onChange={handleNameChange}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...form.register("slug")} />
              {form.formState.errors.slug && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={watchedType}
                onValueChange={(val) =>
                  form.setValue(
                    "type",
                    val as CreateProviderInput["type"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rateLimitPerMinute">Rate Limit / min</Label>
              <Input
                id="rateLimitPerMinute"
                type="number"
                {...form.register("rateLimitPerMinute", {
                  setValueAs: (v: string) =>
                    v === "" ? null : parseInt(v, 10),
                })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="costPerUnit">Cost per Unit</Label>
              <Input id="costPerUnit" {...form.register("costPerUnit")} />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="isEnabled"
                checked={watchedIsEnabled}
                onCheckedChange={(checked) =>
                  form.setValue("isEnabled", checked)
                }
              />
              <Label htmlFor="isEnabled">Enabled</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Config (JSON)</Label>
            <JsonEditor
              value={watchedConfig ?? null}
              onChange={(val) => form.setValue("config", val)}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Update Provider"
                  : "Create Provider"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/providers")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
