"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { SpeechGenerationCard } from "./speech-generation-card";
import { SPEECH_GENERATION_PROVIDERS, SPEECH_GENERATION_STATUSES } from "@contenthq/shared";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  elevenlabs: "ElevenLabs",
  google: "Google Cloud",
  "google-gemini": "Google Gemini",
  inworld: "Inworld",
  sarvam: "Sarvam",
};

export function SpeechGenerationList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data: generations, isLoading } =
    trpc.speechGeneration.list.useQuery({
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as "pending" | "processing" | "completed" | "failed"),
      provider:
        providerFilter === "all"
          ? undefined
          : (providerFilter as "openai" | "elevenlabs" | "google" | "google-gemini" | "inworld" | "sarvam"),
      limit: 50,
      offset: 0,
    });

  const retryMutation = trpc.speechGeneration.retry.useMutation({
    onSuccess: () => {
      toast.success("Generation retried");
      utils.speechGeneration.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Retry failed: ${error.message}`);
    },
  });

  const deleteMutation = trpc.speechGeneration.delete.useMutation({
    onSuccess: () => {
      toast.success("Generation deleted");
      utils.speechGeneration.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {SPEECH_GENERATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Provider</Label>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {SPEECH_GENERATION_PROVIDERS.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {PROVIDER_LABELS[provider] || provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Loading generations...</p>
        </div>
      ) : !generations || generations.length === 0 ? (
        <div className="flex items-center justify-center h-32 border rounded-lg border-dashed">
          <p className="text-muted-foreground">
            No speech generations yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {generations.map((gen) => (
            <SpeechGenerationCard
              key={gen.id}
              generation={{
                ...gen,
                voiceSettings: gen.voiceSettings as Record<string, unknown> | null,
                createdAt: new Date(gen.createdAt),
                updatedAt: new Date(gen.updatedAt),
                completedAt: gen.completedAt ? new Date(gen.completedAt) : null,
              }}
              onRetry={(id) => retryMutation.mutate({ id })}
              onDelete={(id) => deleteMutation.mutate({ id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
