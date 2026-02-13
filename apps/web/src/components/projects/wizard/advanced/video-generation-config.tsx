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
  { value: "zoom_in", label: "Zoom In" },
  { value: "zoom_out", label: "Zoom Out" },
  { value: "pan_left", label: "Pan Left" },
  { value: "pan_right", label: "Pan Right" },
  { value: "pan_up", label: "Pan Up" },
  { value: "pan_down", label: "Pan Down" },
  { value: "kenburns_in", label: "Ken Burns In" },
  { value: "kenburns_out", label: "Ken Burns Out" },
  { value: "static", label: "Static" },
];

const MOTION_ASSIGNMENTS = [
  { value: "system_random", label: "System Random" },
  { value: "ai_random", label: "AI Contextual" },
  { value: "manual", label: "Manual" },
];

export function VideoGenerationConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.videoGeneration" as any;

  const durationPerScene =
    form.watch(`${configKey}.durationPerScene` as any) ?? 5;
  const motionAssignment = form.watch(`${configKey}.motionAssignment` as any) ?? "system_random";
  const motionSpeed = form.watch(`${configKey}.motionSpeed` as any) ?? 0.5;

  return (
    <div className="space-y-3">
      <ProviderModelSelect stageType="video" configKey={configKey} />
      <div className="space-y-1.5">
        <Label className="text-xs">Animation Assignment</Label>
        <Select
          value={motionAssignment}
          onValueChange={(v) =>
            form.setValue(`${configKey}.motionAssignment` as any, v)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select assignment" />
          </SelectTrigger>
          <SelectContent>
            {MOTION_ASSIGNMENTS.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {motionAssignment === "manual" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Motion Type</Label>
          <Select
            value={form.watch(`${configKey}.motionType` as any) ?? "kenburns_in"}
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
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">
          Motion Speed: {motionSpeed}
        </Label>
        <Slider
          min={0.1}
          max={1.0}
          step={0.1}
          value={[motionSpeed]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.motionSpeed` as any, v)
          }
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Gentle</span>
          <span>Dramatic</span>
        </div>
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
