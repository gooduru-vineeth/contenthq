"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ProviderModelSelect } from "./provider-model-select";
import { MediaUploadOverride } from "./media-upload-override";

const MOTION_TYPES = [
  { value: "zoom", label: "Zoom" },
  { value: "pan", label: "Pan" },
  { value: "kenburns", label: "Ken Burns" },
  { value: "static", label: "Static" },
];

export function VideoGenerationConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.videoGeneration" as any;

  const durationPerScene =
    form.watch(`${configKey}.durationPerScene` as any) ?? 5;

  return (
    <div className="space-y-3">
      <ProviderModelSelect stageType="video" configKey={configKey} />
      <div className="space-y-1.5">
        <Label className="text-xs">Motion Type</Label>
        <Select
          value={form.watch(`${configKey}.motionType` as any) ?? "kenburns"}
          onValueChange={(v) =>
            form.setValue(`${configKey}.motionType` as any, v)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select motion" />
          </SelectTrigger>
          <SelectContent>
            {MOTION_TYPES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">
          Duration Per Scene: {durationPerScene}s
        </Label>
        <Slider
          min={1}
          max={30}
          step={1}
          value={[durationPerScene]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.durationPerScene` as any, v)
          }
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1s</span>
          <span>30s</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Custom Video Clips</Label>
        <MediaUploadOverride
          label="Drop video clips here to override AI generation"
          accept="video/*"
          currentUrl={form.watch(`${configKey}.customVideoUrl` as any)}
          onUpload={(_file) => {
            // Upload handled by parent - set URL after upload
          }}
          onRemove={() =>
            form.setValue(`${configKey}.customVideoUrl` as any, undefined)
          }
        />
      </div>
    </div>
  );
}
