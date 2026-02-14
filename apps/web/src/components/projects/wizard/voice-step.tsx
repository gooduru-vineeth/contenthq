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
import { trpc } from "@/lib/trpc";

const TTS_PROVIDERS = [
  { value: "openai", label: "OpenAI", description: "Natural voices, fast generation" },
  { value: "elevenlabs", label: "ElevenLabs", description: "Premium quality, voice cloning" },
  { value: "google", label: "Google Cloud", description: "100+ voices, 40+ languages" },
  { value: "gemini", label: "Google Gemini", description: "Experimental, free tier" },
  { value: "sarvam", label: "Sarvam AI", description: "39 voices, 11 Indian languages" },
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
    // Hindi
    { value: "meera", label: "Meera (Hindi, Female)" },
    { value: "pavithra", label: "Pavithra (Hindi, Female)" },
    { value: "maitreyi", label: "Maitreyi (Hindi, Female)" },
    { value: "arvind", label: "Arvind (Hindi, Male)" },
    { value: "arjun", label: "Arjun (Hindi, Male)" },
    { value: "shubh", label: "Shubh (Hindi, Male)" },
    // Bengali
    { value: "neel", label: "Neel (Bengali, Male)" },
    { value: "amartya", label: "Amartya (Bengali, Male)" },
    { value: "diya", label: "Diya (Bengali, Female)" },
    // Kannada
    { value: "amrutha", label: "Amrutha (Kannada, Female)" },
    { value: "venkatesh", label: "Venkatesh (Kannada, Male)" },
    { value: "masala_chai", label: "Masala Chai (Kannada, Male)" },
    // Malayalam
    { value: "theertha", label: "Theertha (Malayalam, Female)" },
    { value: "maya", label: "Maya (Malayalam, Female)" },
    { value: "surya", label: "Surya (Malayalam, Male)" },
    // Marathi
    { value: "devika", label: "Devika (Marathi, Female)" },
    { value: "kalpana", label: "Kalpana (Marathi, Female)" },
    { value: "samar", label: "Samar (Marathi, Male)" },
    // Odia
    { value: "ananya", label: "Ananya (Odia, Female)" },
    { value: "umesh", label: "Umesh (Odia, Male)" },
    // Punjabi
    { value: "gurpreet", label: "Gurpreet (Punjabi, Male)" },
    { value: "simran", label: "Simran (Punjabi, Female)" },
    // Tamil
    { value: "revathi", label: "Revathi (Tamil, Female)" },
    { value: "sri", label: "Sri (Tamil, Male)" },
    { value: "tamizh", label: "Tamizh (Tamil, Male)" },
    { value: "filter_coffee", label: "Filter Coffee (Tamil, Male)" },
    // Telugu
    { value: "lakshmi", label: "Lakshmi (Telugu, Female)" },
    { value: "vishnu", label: "Vishnu (Telugu, Male)" },
    { value: "hyderabadi_biryani", label: "Hyderabadi Biryani (Telugu, Male)" },
    // English (Indian)
    { value: "advika", label: "Advika (English, Female)" },
    { value: "raman", label: "Raman (English, Male)" },
    { value: "vidya", label: "Vidya (English, Female)" },
    { value: "arjun_english", label: "Arjun English (English, Male)" },
    // Gujarati
    { value: "namrata", label: "Namrata (Gujarati, Female)" },
    { value: "hiral", label: "Hiral (Gujarati, Female)" },
    { value: "dhwani", label: "Dhwani (Gujarati, Female)" },
    { value: "keshav", label: "Keshav (Gujarati, Male)" },
    { value: "jhanvi", label: "Jhanvi (Gujarati, Female)" },
    { value: "undhiyu", label: "Undhiyu (Gujarati, Male)" },
  ],
  inworld: [],
};

export function VoiceStep() {
  const form = useFormContext<CreateProjectInput>();
  const selectedProvider = form.watch("ttsProvider") ?? "openai";

  // Fetch real voices from API for providers without static voice lists
  const { data: dynamicVoices } = trpc.speechGeneration.getVoices.useQuery(
    { provider: selectedProvider },
    { enabled: selectedProvider === "inworld" }
  );

  const voices = selectedProvider === "inworld" && dynamicVoices?.length
    ? dynamicVoices.map((v) => ({ value: v.id, label: v.name }))
    : VOICES_BY_PROVIDER[selectedProvider] ?? [];

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
