"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface StagePanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  configKey: string;
  defaultEnabled?: boolean;
  children: ReactNode;
}

export function StagePanel({
  title,
  description,
  icon: Icon,
  configKey,
  defaultEnabled = true,
  children,
}: StagePanelProps) {
  const form = useFormContext<CreateProjectInput>();
  const enabledKey = `${configKey}.enabled` as any;
  const instructionsKey = `${configKey}.customInstructions` as any;
  const isEnabled = form.watch(enabledKey) ?? defaultEnabled;

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              isEnabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => form.setValue(enabledKey, checked)}
        />
      </div>
      {isEnabled && (
        <div className="border-t p-4 space-y-4">
          {children}
          <div className="space-y-2">
            <Label className="text-xs">Custom Instructions</Label>
            <Textarea
              placeholder="Optional instructions for this stage..."
              value={form.watch(instructionsKey) ?? ""}
              onChange={(e) => form.setValue(instructionsKey, e.target.value)}
              className="h-16 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
