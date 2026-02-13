"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function IngestionConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.ingestion" as any;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Extract Images</Label>
        <Switch
          checked={form.watch(`${configKey}.extractImages` as any) ?? true}
          onCheckedChange={(checked) =>
            form.setValue(`${configKey}.extractImages` as any, checked)
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Max Content Length</Label>
        <Input
          type="number"
          placeholder="50000"
          value={form.watch(`${configKey}.maxContentLength` as any) ?? ""}
          onChange={(e) =>
            form.setValue(
              `${configKey}.maxContentLength` as any,
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
