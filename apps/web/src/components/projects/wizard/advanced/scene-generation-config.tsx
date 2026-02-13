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
import { ProviderModelSelect } from "./provider-model-select";

const VISUAL_STYLES = [
  { value: "photorealistic", label: "Photorealistic" },
  { value: "cinematic", label: "Cinematic" },
  { value: "illustration", label: "Illustration" },
  { value: "anime", label: "Anime" },
  { value: "watercolor", label: "Watercolor" },
  { value: "3d_render", label: "3D Render" },
  { value: "comic", label: "Comic" },
  { value: "oil_painting", label: "Oil Painting" },
  { value: "pixel_art", label: "Pixel Art" },
  { value: "minimalist", label: "Minimalist" },
];

export function SceneGenerationConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.sceneGeneration" as any;

  return (
    <div className="space-y-3">
      <ProviderModelSelect stageType="llm" configKey={configKey} />
      <div className="space-y-1.5">
        <Label className="text-xs">Visual Style</Label>
        <Select
          value={form.watch(`${configKey}.visualStyle` as any) ?? ""}
          onValueChange={(v) =>
            form.setValue(`${configKey}.visualStyle` as any, v)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            {VISUAL_STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Image Prompt Style</Label>
        <Input
          placeholder="e.g., detailed, vibrant colors, soft lighting"
          value={form.watch(`${configKey}.imagePromptStyle` as any) ?? ""}
          onChange={(e) =>
            form.setValue(`${configKey}.imagePromptStyle` as any, e.target.value)
          }
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
