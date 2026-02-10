"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCProvider } from "@/components/trpc-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <TooltipProvider delayDuration={0}>
        {children}
      </TooltipProvider>
    </TRPCProvider>
  );
}
