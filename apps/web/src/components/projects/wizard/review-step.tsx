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
        </dl>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
