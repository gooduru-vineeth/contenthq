"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface WizardState {
  step: number;
  totalSteps: number;
}

interface WizardActions {
  next: () => void;
  prev: () => void;
  goTo: (step: number) => void;
}

interface WizardContextValue {
  state: WizardState;
  actions: WizardActions;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}

interface WizardProviderProps {
  totalSteps: number;
  onBeforeNext?: (currentStep: number) => boolean;
  children: ReactNode;
}

export function WizardProvider({
  totalSteps,
  onBeforeNext,
  children,
}: WizardProviderProps) {
  const [step, setStep] = useState(0);

  const next = useCallback(() => {
    if (onBeforeNext && !onBeforeNext(step)) return;
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [step, totalSteps, onBeforeNext]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      setStep(Math.max(0, Math.min(target, totalSteps - 1)));
    },
    [totalSteps],
  );

  return (
    <WizardContext.Provider
      value={{ state: { step, totalSteps }, actions: { next, prev, goTo } }}
    >
      {children}
    </WizardContext.Provider>
  );
}

interface WizardStepProps {
  index: number;
  children: ReactNode;
}

export function WizardStep({ index, children }: WizardStepProps) {
  const { state } = useWizard();
  if (state.step !== index) return null;
  return <>{children}</>;
}
