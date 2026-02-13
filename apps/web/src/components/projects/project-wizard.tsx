"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProjectSchema } from "@contenthq/shared";
import type { CreateProjectInput } from "@contenthq/shared";
import type { Resolver } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { WizardProvider, WizardStep } from "./wizard/wizard-context";
import { StepIndicator } from "./wizard/step-indicator";
import { SourceStep } from "./wizard/source-step";
import { OptionsStep } from "./wizard/options-step";
import { VoiceStep } from "./wizard/voice-step";
import { MusicStep } from "./wizard/music-step";
import { ReviewStep } from "./wizard/review-step";
import { WizardNavigation } from "./wizard/wizard-navigation";
import { StageConfigStep } from "./wizard/advanced/stage-config-step";
import { VariationsStep } from "./wizard/variations/variations-step";
import { cn } from "@/lib/utils";

const SIMPLE_STEPS = ["Source", "Options", "Voice", "Music", "Review"];
const ADVANCED_STEPS = ["Source", "Options", "Stage Config", "Variations", "Review"];

export function ProjectWizard() {
  const router = useRouter();
  const [mode, setMode] = useState<"simple" | "advanced">("simple");

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
      enableVideoGeneration: false,
      pipelineMode: "simple",
      enableCaptions: false,
    },
  });

  const steps = mode === "simple" ? SIMPLE_STEPS : ADVANCED_STEPS;

  const createProject = trpc.project.create.useMutation({
    onSuccess: (data) => {
      router.push(`/projects/${data.id}`);
    },
  });

  function validateStep(step: number): boolean {
    if (step === 0) {
      const content = form.getValues("inputContent");
      if (!content?.trim()) {
        form.setError("inputContent", { message: "Required" });
        return false;
      }
      form.clearErrors("inputContent");
    }
    return true;
  }

  function handleModeChange(newMode: "simple" | "advanced") {
    setMode(newMode);
    form.setValue("pipelineMode", newMode);
  }

  function onSubmit(data: CreateProjectInput) {
    createProject.mutate(data);
  }

  return (
    <WizardProvider totalSteps={steps.length} onBeforeNext={validateStep}>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Mode Toggle */}
        <div className="flex items-center justify-center gap-1 rounded-lg border p-1">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "simple"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => handleModeChange("simple")}
          >
            Simple
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "advanced"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => handleModeChange("advanced")}
          >
            Advanced
          </button>
        </div>

        <StepIndicator steps={steps} />
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <WizardStep index={0}>
              <SourceStep />
            </WizardStep>
            <WizardStep index={1}>
              <OptionsStep />
            </WizardStep>
            {mode === "simple" ? (
              <>
                <WizardStep index={2}>
                  <VoiceStep />
                </WizardStep>
                <WizardStep index={3}>
                  <MusicStep />
                </WizardStep>
                <WizardStep index={4}>
                  <ReviewStep error={createProject.error ?? undefined} />
                </WizardStep>
              </>
            ) : (
              <>
                <WizardStep index={2}>
                  <StageConfigStep />
                </WizardStep>
                <WizardStep index={3}>
                  <VariationsStep />
                </WizardStep>
                <WizardStep index={4}>
                  <ReviewStep error={createProject.error ?? undefined} />
                </WizardStep>
              </>
            )}
            <WizardNavigation isPending={createProject.isPending} />
          </form>
        </FormProvider>
      </div>
    </WizardProvider>
  );
}
