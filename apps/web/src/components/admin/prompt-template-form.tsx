"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PROMPT_TYPES,
  PROMPT_TYPE_LABELS,
  createPromptTemplateSchema,
} from "@contenthq/shared";
import type { CreatePromptTemplateInput } from "@contenthq/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PromptTemplateFormProps {
  onSubmit: (data: CreatePromptTemplateInput) => void;
  defaultValues?: Partial<CreatePromptTemplateInput>;
  isLoading?: boolean;
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  const unique = new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")));
  return Array.from(unique);
}

export function PromptTemplateForm({
  onSubmit,
  defaultValues,
  isLoading,
}: PromptTemplateFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePromptTemplateInput>({
    resolver: zodResolver(createPromptTemplateSchema),
    defaultValues: {
      type: defaultValues?.type ?? "story_writing",
      name: defaultValues?.name ?? "",
      content: defaultValues?.content ?? "",
      description: defaultValues?.description ?? "",
      variables: defaultValues?.variables ?? [],
    },
  });

  const contentValue = watch("content");
  const detectedVariables = useMemo(
    () => extractVariables(contentValue ?? ""),
    [contentValue]
  );

  useEffect(() => {
    setValue("variables", detectedVariables);
  }, [detectedVariables, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          defaultValue={defaultValues?.type ?? "story_writing"}
          onValueChange={(value) =>
            setValue("type", value as CreatePromptTemplateInput["type"])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select prompt type" />
          </SelectTrigger>
          <SelectContent>
            {PROMPT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {PROMPT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="e.g., Default Story Writer"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Brief description of this template"
          rows={2}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          placeholder="Enter prompt template content. Use {{variable}} for dynamic values."
          rows={10}
          className="font-mono text-sm"
          {...register("content")}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      {detectedVariables.length > 0 && (
        <div className="space-y-2">
          <Label>Detected Variables</Label>
          <div className="flex flex-wrap gap-1.5">
            {detectedVariables.map((v) => (
              <Badge key={v} variant="outline" className="font-mono text-xs">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? "Saving..."
          : defaultValues?.name
            ? "Update Template"
            : "Create Template"}
      </Button>
    </form>
  );
}
