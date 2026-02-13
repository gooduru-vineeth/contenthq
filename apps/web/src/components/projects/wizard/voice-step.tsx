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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TTS_PROVIDERS = [
  { value: "openai", label: "OpenAI", description: "Natural voices, fast generation" },
  { value: "elevenlabs", label: "ElevenLabs", description: "Premium quality, voice cloning" },
  { value: "google", label: "Google Cloud", description: "100+ voices, 40+ languages" },
  { value: "gemini", label: "Google Gemini", description: "Experimental, free tier" },
  { value: "sarvam", label: "Sarvam AI", description: "Indic languages specialist" },
  { value: "inworld", label: "Inworld AI", description: "Character voices with emotions" },
];

const VOICES_BY_PROVIDER: Record<string, Array<{ value: string; label: string }>> = {
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
  ],
  google: [
    { value: "en-US-Standard-A", label: "Standard A (Female)" },
    { value: "en-US-Standard-B", label: "Standard B (Male)" },
    { value: "en-US-Wavenet-A", label: "Wavenet A (Female)" },
    { value: "en-US-Wavenet-B", label: "Wavenet B (Male)" },
  ],
  gemini: [
    { value: "gemini-default", label: "Default" },
  ],
  sarvam: [
    { value: "sarvam-hindi", label: "Hindi Voice" },
    { value: "sarvam-tamil", label: "Tamil Voice" },
  ],
  inworld: [
    { value: "narrator", label: "Narrator" },
    { value: "character-1", label: "Character 1" },
  ],
};

export function VoiceStep() {
  const form = useFormContext<CreateProjectInput>();
  const selectedProvider = form.watch("ttsProvider") ?? "openai";
  const voices = VOICES_BY_PROVIDER[selectedProvider] ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Settings</CardTitle>
        <CardDescription>
          Choose a TTS provider and voice for narration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>TTS Provider</Label>
          <div className="grid grid-cols-2 gap-2">
            {TTS_PROVIDERS.map((provider) => (
              <button
                key={provider.value}
                type="button"
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  selectedProvider === provider.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                )}
                onClick={() => {
                  form.setValue("ttsProvider", provider.value);
                  form.setValue("ttsVoiceId", undefined);
                }}
              >
                <p className="text-sm font-medium">{provider.label}</p>
                <p className="text-xs text-muted-foreground">
                  {provider.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Voice</Label>
          <Select
            value={form.watch("ttsVoiceId") ?? ""}
            onValueChange={(v) => form.setValue("ttsVoiceId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  {voice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
