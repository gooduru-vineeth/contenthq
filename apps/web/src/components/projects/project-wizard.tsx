"use client";

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
import { ReviewStep } from "./wizard/review-step";
import { WizardNavigation } from "./wizard/wizard-navigation";

const STEPS = ["Source", "Options", "Review"];

export function ProjectWizard() {
  const router = useRouter();

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
    },
  });

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

  function onSubmit(data: CreateProjectInput) {
    createProject.mutate(data);
  }

  return (
    <WizardProvider totalSteps={STEPS.length} onBeforeNext={validateStep}>
      <div className="mx-auto max-w-2xl space-y-6">
        <StepIndicator steps={STEPS} />
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <WizardStep index={0}>
              <SourceStep />
            </WizardStep>
            <WizardStep index={1}>
              <OptionsStep />
            </WizardStep>
            <WizardStep index={2}>
              <ReviewStep error={createProject.error ?? undefined} />
            </WizardStep>
            <WizardNavigation isPending={createProject.isPending} />
          </form>
        </FormProvider>
      </div>
    </WizardProvider>
  );
}
