"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ProviderModelSelect } from "./provider-model-select";

const NARRATIVE_STRUCTURES = [
  { value: "linear", label: "Linear" },
  { value: "hero_journey", label: "Hero's Journey" },
  { value: "problem_solution", label: "Problem / Solution" },
  { value: "listicle", label: "Listicle" },
  { value: "documentary", label: "Documentary" },
];

export function StoryWritingConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.storyWriting" as any;

  const temperature = form.watch(`${configKey}.temperature` as any) ?? 0.7;

  return (
    <div className="space-y-3">
      <ProviderModelSelect stageType="llm" configKey={configKey} />
      <div className="space-y-1.5">
        <Label className="text-xs">Narrative Structure</Label>
        <Select
          value={
            form.watch(`${configKey}.narrativeStructure` as any) ?? "linear"
          }
          onValueChange={(v) =>
            form.setValue(`${configKey}.narrativeStructure` as any, v)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select structure" />
          </SelectTrigger>
          <SelectContent>
            {NARRATIVE_STRUCTURES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Target Scene Count</Label>
        <Input
          type="number"
          min={1}
          max={50}
          placeholder="10"
          value={form.watch(`${configKey}.targetSceneCount` as any) ?? ""}
          onChange={(e) =>
            form.setValue(
              `${configKey}.targetSceneCount` as any,
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Temperature: {temperature}</Label>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={[temperature]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.temperature` as any, v)
          }
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Precise (0)</span>
          <span>Creative (2)</span>
        </div>
      </div>
    </div>
  );
}
