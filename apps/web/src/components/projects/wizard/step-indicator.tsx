"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWizard } from "./wizard-context";

interface StepIndicatorProps {
  steps: string[];
}

export function StepIndicator({ steps }: StepIndicatorProps) {
  const { state } = useWizard();

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, index) => (
        <div key={label} className="flex items-center">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
              index < state.step
                ? "bg-primary text-primary-foreground"
                : index === state.step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {index < state.step ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          <span
            className={cn(
              "ml-2 text-sm",
              index === state.step
                ? "font-medium"
                : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "mx-4 h-0.5 w-12 rounded-full",
                index < state.step ? "bg-primary" : "bg-muted",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
