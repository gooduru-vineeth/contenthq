"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Link as LinkIcon,
  Type,
} from "lucide-react";
import { createProjectSchema } from "@contenthq/shared";
import type { CreateProjectInput } from "@contenthq/shared";
import type { Resolver } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STEPS = ["Source", "Options", "Review"] as const;

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "educational", label: "Educational" },
  { value: "dramatic", label: "Dramatic" },
  { value: "humorous", label: "Humorous" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "1:1", label: "1:1 (Square)" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "hi", label: "Hindi" },
];

function detectInputType(value: string): "url" | "topic" {
  try {
    new URL(value);
    return "url";
  } catch {
    return value.match(/^https?:\/\//) ? "url" : "topic";
  }
}

export function ProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema) as Resolver<CreateProjectInput>,
    defaultValues: {
      title: "",
      inputType: "topic",
      inputContent: "",
      aspectRatio: "16:9",
      targetDuration: 60,
      tone: "professional",
      language: "en",
    },
  });

  const createProject = trpc.project.create.useMutation({
    onSuccess: (data) => {
      router.push(`/projects/${data.id}`);
    },
  });

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

  function nextStep() {
    if (step === 0) {
      const content = form.getValues("inputContent");
      if (!content?.trim()) {
        form.setError("inputContent", { message: "Required" });
        return;
      }
      form.clearErrors("inputContent");
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function onSubmit(data: CreateProjectInput) {
    createProject.mutate(data);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                index < step
                  ? "bg-primary text-primary-foreground"
                  : index === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {index < step ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={cn(
                "ml-2 text-sm",
                index === step ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-0.5 w-12 rounded-full",
                  index < step ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Step 1: Source */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Content Source</CardTitle>
              <CardDescription>
                Provide a URL to ingest or describe a topic to create content
                about.
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
                    <span className="font-medium capitalize">
                      {detectedType}
                    </span>
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
        )}

        {/* Step 2: Options */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Options</CardTitle>
              <CardDescription>
                Configure tone, duration, and output format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={form.watch("tone")}
                  onValueChange={(v) => form.setValue("tone", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDuration">
                  Duration (seconds): {form.watch("targetDuration")}s
                </Label>
                <Input
                  id="targetDuration"
                  type="range"
                  min={15}
                  max={300}
                  step={15}
                  {...form.register("targetDuration", { valueAsNumber: true })}
                  className="h-2 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>15s</span>
                  <span>300s</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select
                  value={form.watch("aspectRatio")}
                  onValueChange={(v) =>
                    form.setValue(
                      "aspectRatio",
                      v as "16:9" | "9:16" | "1:1",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ar) => (
                      <SelectItem key={ar.value} value={ar.value}>
                        {ar.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={form.watch("language")}
                  onValueChange={(v) => form.setValue("language", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
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
                  <dd className="font-medium">{form.watch("title") || "Untitled"}</dd>
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
                  <dd className="font-medium capitalize">
                    {form.watch("tone")}
                  </dd>
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

              {createProject.error && (
                <p className="mt-4 text-sm text-destructive">
                  {createProject.error.message}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
