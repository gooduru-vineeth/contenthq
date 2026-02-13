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
import { cn } from "@/lib/utils";
import { CaptionStyleSelector } from "./caption-style-selector";

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

const VISUAL_STYLES = [
  { value: "photorealistic", label: "Photorealistic", emoji: "\u{1F4F7}" },
  { value: "cinematic", label: "Cinematic", emoji: "\u{1F3AC}" },
  { value: "digital_art", label: "Digital Art", emoji: "\u{1F3A8}" },
  { value: "anime", label: "Anime", emoji: "\u{2728}" },
  { value: "oil_painting", label: "Oil Painting", emoji: "\u{1F5BC}\u{FE0F}" },
  { value: "watercolor", label: "Watercolor", emoji: "\u{1F4A7}" },
  { value: "3d_render", label: "3D Render", emoji: "\u{1F9CA}" },
  { value: "minimalist", label: "Minimalist", emoji: "\u{2B1C}" },
  { value: "cartoon", label: "Cartoon", emoji: "\u{1F3AD}" },
  { value: "sketch", label: "Sketch", emoji: "\u{270F}\u{FE0F}" },
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

        {/* Visual Style */}
        <div className="space-y-2">
          <Label>Visual Style</Label>
          <div className="grid grid-cols-5 gap-2">
            {VISUAL_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                  form.watch("visualStyle") === style.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                )}
                onClick={() => form.setValue("visualStyle", style.value)}
              >
                <span className="text-lg">{style.emoji}</span>
                <span className="text-[10px] leading-tight text-center">
                  {style.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Enable Captions */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="enableCaptions">Captions</Label>
            <p className="text-xs text-muted-foreground">
              Add auto-generated captions to your video
            </p>
          </div>
          <Switch
            id="enableCaptions"
            checked={form.watch("enableCaptions") ?? false}
            onCheckedChange={(checked) =>
              form.setValue("enableCaptions", checked)
            }
          />
        </div>

        {/* Caption Style & Position (visible only when captions enabled) */}
        {form.watch("enableCaptions") && (
          <div className="rounded-lg border p-4">
            <CaptionStyleSelector />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
