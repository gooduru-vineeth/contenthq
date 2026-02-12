"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "./wizard-context";

interface WizardNavigationProps {
  isPending?: boolean;
}

export function WizardNavigation({ isPending }: WizardNavigationProps) {
  const { state, actions } = useWizard();
  const isLastStep = state.step === state.totalSteps - 1;

  return (
    <div className="mt-6 flex justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={actions.prev}
        disabled={state.step === 0}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {!isLastStep ? (
        <Button type="button" onClick={actions.next}>
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="submit" disabled={isPending}>
          {isPending ? (
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
  );
}
