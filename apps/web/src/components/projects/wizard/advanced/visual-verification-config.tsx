"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export function VisualVerificationConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.visualVerification" as any;

  const threshold = form.watch(`${configKey}.threshold` as any) ?? 60;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Acceptance Threshold: {threshold}%</Label>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[threshold]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.threshold` as any, v)
          }
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Lenient (0%)</span>
          <span>Strict (100%)</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Auto Retry Count</Label>
        <Input
          type="number"
          min={0}
          max={5}
          placeholder="2"
          value={form.watch(`${configKey}.autoRetryCount` as any) ?? ""}
          onChange={(e) =>
            form.setValue(
              `${configKey}.autoRetryCount` as any,
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
