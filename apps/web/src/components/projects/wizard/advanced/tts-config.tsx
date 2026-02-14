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
import { trpc } from "@/lib/trpc";
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
    // Hindi
    { value: "meera", label: "Meera (Hindi, F)" },
    { value: "pavithra", label: "Pavithra (Hindi, F)" },
    { value: "maitreyi", label: "Maitreyi (Hindi, F)" },
    { value: "arvind", label: "Arvind (Hindi, M)" },
    { value: "arjun", label: "Arjun (Hindi, M)" },
    { value: "shubh", label: "Shubh (Hindi, M)" },
    // Bengali
    { value: "neel", label: "Neel (Bengali, M)" },
    { value: "amartya", label: "Amartya (Bengali, M)" },
    { value: "diya", label: "Diya (Bengali, F)" },
    // Kannada
    { value: "amrutha", label: "Amrutha (Kannada, F)" },
    { value: "venkatesh", label: "Venkatesh (Kannada, M)" },
    { value: "masala_chai", label: "Masala Chai (Kannada, M)" },
    // Malayalam
    { value: "theertha", label: "Theertha (Malayalam, F)" },
    { value: "maya", label: "Maya (Malayalam, F)" },
    { value: "surya", label: "Surya (Malayalam, M)" },
    // Marathi
    { value: "devika", label: "Devika (Marathi, F)" },
    { value: "kalpana", label: "Kalpana (Marathi, F)" },
    { value: "samar", label: "Samar (Marathi, M)" },
    // Odia
    { value: "ananya", label: "Ananya (Odia, F)" },
    { value: "umesh", label: "Umesh (Odia, M)" },
    // Punjabi
    { value: "gurpreet", label: "Gurpreet (Punjabi, M)" },
    { value: "simran", label: "Simran (Punjabi, F)" },
    // Tamil
    { value: "revathi", label: "Revathi (Tamil, F)" },
    { value: "sri", label: "Sri (Tamil, M)" },
    { value: "tamizh", label: "Tamizh (Tamil, M)" },
    { value: "filter_coffee", label: "Filter Coffee (Tamil, M)" },
    // Telugu
    { value: "lakshmi", label: "Lakshmi (Telugu, F)" },
    { value: "vishnu", label: "Vishnu (Telugu, M)" },
    { value: "hyderabadi_biryani", label: "Hyderabadi Biryani (Telugu, M)" },
    // English (Indian)
    { value: "advika", label: "Advika (English, F)" },
    { value: "raman", label: "Raman (English, M)" },
    { value: "vidya", label: "Vidya (English, F)" },
    { value: "arjun_english", label: "Arjun English (English, M)" },
    // Gujarati
    { value: "namrata", label: "Namrata (Gujarati, F)" },
    { value: "hiral", label: "Hiral (Gujarati, F)" },
    { value: "dhwani", label: "Dhwani (Gujarati, F)" },
    { value: "keshav", label: "Keshav (Gujarati, M)" },
    { value: "jhanvi", label: "Jhanvi (Gujarati, F)" },
    { value: "undhiyu", label: "Undhiyu (Gujarati, M)" },
  ],
  inworld: [],
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

  // Fetch real voices from API for providers without static voice lists
  const { data: dynamicVoices } = trpc.speechGeneration.getVoices.useQuery(
    { provider },
    { enabled: provider === "inworld" }
  );

  const voices = provider === "inworld" && dynamicVoices?.length
    ? dynamicVoices.map((v) => ({ value: v.id, label: v.name }))
    : VOICES_BY_PROVIDER[provider] ?? [];

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
