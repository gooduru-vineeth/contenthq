"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LANGUAGES } from "./options-step";

interface ReviewStepProps {
  error?: { message: string };
}

export function ReviewStep({ error }: ReviewStepProps) {
  const form = useFormContext<CreateProjectInput>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Create</CardTitle>
        <CardDescription>
          Confirm your project settings before creating.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Title</dt>
            <dd className="font-medium">
              {form.watch("title") || "Untitled"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Source Type</dt>
            <dd className="font-medium capitalize">
              {form.watch("inputType")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Content</dt>
            <dd className="max-w-[60%] truncate font-medium">
              {form.watch("inputContent")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tone</dt>
            <dd className="font-medium capitalize">{form.watch("tone")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="font-medium">
              {form.watch("targetDuration")}s
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Aspect Ratio</dt>
            <dd className="font-medium">{form.watch("aspectRatio")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Language</dt>
            <dd className="font-medium">
              {LANGUAGES.find((l) => l.value === form.watch("language"))
                ?.label ?? form.watch("language")}
            </dd>
          </div>
          {form.watch("visualStyle") && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Visual Style</dt>
              <dd className="font-medium capitalize">
                {form.watch("visualStyle")?.replace(/_/g, " ")}
              </dd>
            </div>
          )}
          {form.watch("ttsProvider") && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">TTS Provider</dt>
              <dd className="font-medium capitalize">
                {form.watch("ttsProvider")}
              </dd>
            </div>
          )}
          {form.watch("ttsVoiceId") && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Voice</dt>
              <dd className="font-medium">{form.watch("ttsVoiceId")}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Captions</dt>
            <dd className="font-medium">
              {form.watch("enableCaptions") ? "Enabled" : "Disabled"}
            </dd>
          </div>
          {form.watch("enableCaptions") && form.watch("captionStyle") && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Caption Style</dt>
              <dd className="font-medium capitalize">
                {form.watch("captionStyle")?.replace(/-/g, " ")}
              </dd>
            </div>
          )}
          {form.watch("enableCaptions") && form.watch("captionPosition") && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Caption Position</dt>
              <dd className="font-medium capitalize">
                {form.watch("captionPosition")?.replace("-center", "")}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Mode</dt>
            <dd className="font-medium capitalize">
              {form.watch("pipelineMode") ?? "simple"}
            </dd>
          </div>
        </dl>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
