"use client";

import { useFormContext } from "react-hook-form";
import { Link as LinkIcon, Type } from "lucide-react";
import type { CreateProjectInput } from "@contenthq/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function detectInputType(value: string): "url" | "topic" {
  try {
    new URL(value);
    return "url";
  } catch {
    return value.match(/^https?:\/\//) ? "url" : "topic";
  }
}

export function SourceStep() {
  const form = useFormContext<CreateProjectInput>();
  const inputContent = form.watch("inputContent");
  const detectedType = inputContent?.trim()
    ? detectInputType(inputContent.trim())
    : null;

  function handleInputContentChange(value: string) {
    form.setValue("inputContent", value);
    if (value.trim()) {
      const type = detectInputType(value.trim());
      form.setValue("inputType", type);
      if (!form.getValues("title")) {
        form.setValue(
          "title",
          type === "url" ? "New Project" : value.trim().slice(0, 100),
        );
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Source</CardTitle>
        <CardDescription>
          Provide a URL to ingest or describe a topic to create content about.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Project Title</Label>
          <Input
            id="title"
            placeholder="My Video Project"
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="inputContent">URL or Topic</Label>
          <div className="relative">
            <Input
              id="inputContent"
              placeholder="Paste a URL or describe a topic..."
              value={inputContent}
              onChange={(e) => handleInputContentChange(e.target.value)}
              className="pr-10"
            />
            {detectedType && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {detectedType === "url" ? (
                  <LinkIcon className="h-4 w-4" />
                ) : (
                  <Type className="h-4 w-4" />
                )}
              </div>
            )}
          </div>
          {detectedType && (
            <p className="text-xs text-muted-foreground">
              Detected as:{" "}
              <span className="font-medium capitalize">{detectedType}</span>
            </p>
          )}
          {form.formState.errors.inputContent && (
            <p className="text-sm text-destructive">
              {form.formState.errors.inputContent.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
