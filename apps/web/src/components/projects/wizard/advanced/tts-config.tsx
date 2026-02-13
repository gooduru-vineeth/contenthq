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
import { MediaUploadOverride } from "./media-upload-override";

const TTS_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "elevenlabs", label: "ElevenLabs" },
  { value: "google", label: "Google Cloud" },
  { value: "gemini", label: "Google Gemini" },
  { value: "sarvam", label: "Sarvam AI" },
  { value: "inworld", label: "Inworld AI" },
];

const VOICES_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "alloy", label: "Alloy" },
    { value: "echo", label: "Echo" },
    { value: "fable", label: "Fable" },
    { value: "onyx", label: "Onyx" },
    { value: "nova", label: "Nova" },
    { value: "shimmer", label: "Shimmer" },
  ],
  elevenlabs: [
    { value: "rachel", label: "Rachel" },
    { value: "adam", label: "Adam" },
    { value: "antoni", label: "Antoni" },
    { value: "bella", label: "Bella" },
    { value: "josh", label: "Josh" },
  ],
  google: [
    { value: "en-US-Standard-A", label: "Standard A" },
    { value: "en-US-Standard-B", label: "Standard B" },
    { value: "en-US-Wavenet-A", label: "WaveNet A" },
    { value: "en-US-Wavenet-B", label: "WaveNet B" },
  ],
  gemini: [
    { value: "default", label: "Default" },
  ],
  sarvam: [
    { value: "hindi-female", label: "Hindi Female" },
    { value: "hindi-male", label: "Hindi Male" },
  ],
  inworld: [
    { value: "narrator", label: "Narrator" },
    { value: "character-1", label: "Character 1" },
  ],
};

const QUALITY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "ultra", label: "Ultra" },
];

export function TtsConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.tts" as any;

  const provider = form.watch(`${configKey}.provider` as any) ?? "openai";
  const speed = form.watch(`${configKey}.speed` as any) ?? 1.0;
  const pitch = form.watch(`${configKey}.pitch` as any) ?? 0;

  const voices = VOICES_BY_PROVIDER[provider] ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => {
              form.setValue(`${configKey}.provider` as any, v);
              form.setValue(`${configKey}.voiceId` as any, undefined);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {TTS_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Voice</Label>
          <Select
            value={form.watch(`${configKey}.voiceId` as any) ?? ""}
            onValueChange={(v) =>
              form.setValue(`${configKey}.voiceId` as any, v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      <div className="space-y-1.5">
        <Label className="text-xs">Speed: {speed.toFixed(1)}x</Label>
        <Slider
          min={0.5}
          max={2.0}
          step={0.1}
          value={[speed]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.speed` as any, v)
          }
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0.5x</span>
          <span>2.0x</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Pitch: {pitch}</Label>
        <Slider
          min={-20}
          max={20}
          step={1}
          value={[pitch]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.pitch` as any, v)
          }
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>-20</span>
          <span>+20</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Custom Voiceover</Label>
        <MediaUploadOverride
          label="Drop audio file to use custom voiceover"
          accept="audio/*"
          currentUrl={form.watch(`${configKey}.customAudioUrl` as any)}
          onUpload={(_file) => {
            // Upload handled by parent - set URL after upload
          }}
          onRemove={() =>
            form.setValue(`${configKey}.customAudioUrl` as any, undefined)
          }
        />
      </div>
    </div>
  );
}
