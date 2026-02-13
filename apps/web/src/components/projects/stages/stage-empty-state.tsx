"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isActive?: boolean;
}

export function StageEmptyState({
  icon: Icon,
  title,
  description,
  isActive,
}: StageEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4",
          isActive && "animate-pulse",
        )}
      >
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
    </div>
  );
}
