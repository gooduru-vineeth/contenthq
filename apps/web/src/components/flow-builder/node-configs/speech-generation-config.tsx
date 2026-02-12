"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { NodeConfigProps } from "./types";

export function SpeechGenerationConfig({ data, onUpdate }: NodeConfigProps) {
  const config = data.config as Record<string, unknown> | undefined;

  const updateConfig = (field: string, value: unknown) => {
    onUpdate("config", { ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sg-provider">Provider</Label>
        <Select
          value={(config?.provider as string) || "openai"}
          onValueChange={(value: string) => updateConfig("provider", value)}
        >
          <SelectTrigger id="sg-provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
            <SelectItem value="google">Google Cloud</SelectItem>
            <SelectItem value="google-gemini">Google Gemini</SelectItem>
            <SelectItem value="inworld">Inworld</SelectItem>
            <SelectItem value="sarvam">Sarvam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sg-voiceId">Voice ID</Label>
        <Input
          id="sg-voiceId"
          value={(config?.voiceId as string) || ""}
          onChange={(e) => updateConfig("voiceId", e.target.value)}
          placeholder="e.g., alloy, coral, nova"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sg-model">Model</Label>
        <Input
          id="sg-model"
          value={(config?.model as string) || ""}
          onChange={(e) => updateConfig("model", e.target.value)}
          placeholder="e.g., tts-1, tts-1-hd"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sg-text">Text (static)</Label>
        <Textarea
          id="sg-text"
          value={(config?.text as string) || ""}
          onChange={(e) => updateConfig("text", e.target.value)}
          placeholder="Enter text or leave empty to use upstream node output"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to use text from upstream node output
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sg-speed">Speed</Label>
        <Input
          id="sg-speed"
          type="number"
          min={0.25}
          max={4}
          step={0.25}
          value={
            ((config?.voiceSettings as Record<string, unknown>)
              ?.speed as number) || 1
          }
          onChange={(e) =>
            onUpdate("config", {
              ...config,
              voiceSettings: {
                ...(config?.voiceSettings as Record<string, unknown>),
                speed: parseFloat(e.target.value) || 1,
              },
            })
          }
        />
      </div>
    </div>
  );
}
