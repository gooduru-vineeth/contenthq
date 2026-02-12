"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { SPEECH_GENERATION_PROVIDERS } from "@contenthq/shared";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  elevenlabs: "ElevenLabs",
  google: "Google Cloud",
  "google-gemini": "Google Gemini",
  inworld: "Inworld",
  sarvam: "Sarvam",
};

interface ProviderVoiceSelectorProps {
  provider: string;
  voiceId: string;
  onProviderChange: (provider: string) => void;
  onVoiceChange: (voiceId: string) => void;
}

export function ProviderVoiceSelector({
  provider,
  voiceId,
  onProviderChange,
  onVoiceChange,
}: ProviderVoiceSelectorProps) {
  const { data: voices, isLoading: voicesLoading } =
    trpc.speechGeneration.getVoices.useQuery(
      { provider },
      { enabled: !!provider }
    );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={provider} onValueChange={onProviderChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select provider..." />
          </SelectTrigger>
          <SelectContent>
            {SPEECH_GENERATION_PROVIDERS.map((p) => (
              <SelectItem key={p} value={p}>
                {PROVIDER_LABELS[p] || p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Voice</Label>
        <Select value={voiceId} onValueChange={onVoiceChange}>
          <SelectTrigger>
            <SelectValue
              placeholder={voicesLoading ? "Loading voices..." : "Select voice..."}
            />
          </SelectTrigger>
          <SelectContent>
            {voices?.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                {voice.name}
                {voice.gender ? ` (${voice.gender})` : ""}
              </SelectItem>
            )) ?? (
              <SelectItem value={voiceId || "alloy"} disabled>
                {voicesLoading ? "Loading..." : "No voices available"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
