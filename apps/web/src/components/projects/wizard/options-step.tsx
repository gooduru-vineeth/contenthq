"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "educational", label: "Educational" },
  { value: "dramatic", label: "Dramatic" },
  { value: "humorous", label: "Humorous" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "1:1", label: "1:1 (Square)" },
];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "hi", label: "Hindi" },
];

export function OptionsStep() {
  const form = useFormContext<CreateProjectInput>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Options</CardTitle>
        <CardDescription>
          Configure tone, duration, and output format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select
            value={form.watch("tone")}
            onValueChange={(v) => form.setValue("tone", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetDuration">
            Duration (seconds): {form.watch("targetDuration")}s
          </Label>
          <Input
            id="targetDuration"
            type="range"
            min={15}
            max={300}
            step={15}
            {...form.register("targetDuration", { valueAsNumber: true })}
            className="h-2 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>15s</span>
            <span>300s</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <Select
            value={form.watch("aspectRatio")}
            onValueChange={(v) =>
              form.setValue(
                "aspectRatio",
                v as "16:9" | "9:16" | "1:1",
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ar) => (
                <SelectItem key={ar.value} value={ar.value}>
                  {ar.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={form.watch("language")}
            onValueChange={(v) => form.setValue("language", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="enableVideoGeneration">Video Generation</Label>
            <p className="text-xs text-muted-foreground">
              Generate video clips from images using AI motion
            </p>
          </div>
          <Switch
            id="enableVideoGeneration"
            checked={form.watch("enableVideoGeneration") ?? false}
            onCheckedChange={(checked) =>
              form.setValue("enableVideoGeneration", checked)
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
