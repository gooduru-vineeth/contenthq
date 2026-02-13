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
import { MediaUploadOverride } from "./media-upload-override";

const IMAGE_SIZES = [
  { value: "1024x1024", label: "1024x1024 (Square)" },
  { value: "1792x1024", label: "1792x1024 (Landscape)" },
  { value: "1024x1792", label: "1024x1792 (Portrait)" },
  { value: "512x512", label: "512x512 (Small)" },
];

const QUALITY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "hd", label: "HD" },
];

export function VisualGenerationConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.visualGeneration" as any;

  return (
    <div className="space-y-3">
      <ProviderModelSelect stageType="image" configKey={configKey} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Image Size</Label>
          <Select
            value={form.watch(`${configKey}.imageSize` as any) ?? "1024x1024"}
            onValueChange={(v) =>
              form.setValue(`${configKey}.imageSize` as any, v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Quality</Label>
          <Select
            value={form.watch(`${configKey}.quality` as any) ?? "standard"}
            onValueChange={(v) =>
              form.setValue(`${configKey}.quality` as any, v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select quality" />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_OPTIONS.map((q) => (
                <SelectItem key={q.value} value={q.value}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Batch Count</Label>
        <Input
          type="number"
          min={1}
          max={4}
          placeholder="1"
          value={form.watch(`${configKey}.batchCount` as any) ?? ""}
          onChange={(e) =>
            form.setValue(
              `${configKey}.batchCount` as any,
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Custom Scene Images</Label>
        <MediaUploadOverride
          label="Drop scene images here to override AI generation"
          accept="image/*"
          currentUrl={form.watch(`${configKey}.customImageUrl` as any)}
          onUpload={(_file) => {
            // Upload handled by parent - set URL after upload
          }}
          onRemove={() =>
            form.setValue(`${configKey}.customImageUrl` as any, undefined)
          }
        />
      </div>
    </div>
  );
}
