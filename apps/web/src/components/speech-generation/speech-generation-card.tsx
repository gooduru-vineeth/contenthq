"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SpeechGenerationPlayer } from "./speech-generation-player";
import type { SpeechGeneration } from "@contenthq/shared";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  elevenlabs: "ElevenLabs",
  google: "Google Cloud",
  "google-gemini": "Gemini",
  inworld: "Inworld",
  sarvam: "Sarvam",
};

interface SpeechGenerationCardProps {
  generation: SpeechGeneration;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SpeechGenerationCard({
  generation,
  onRetry,
  onDelete,
}: SpeechGenerationCardProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {generation.title && (
              <p className="font-medium text-sm">{generation.title}</p>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {generation.inputText}
            </p>
          </div>
          <Badge className={STATUS_COLORS[generation.status] ?? ""}>
            {generation.status}
          </Badge>
        </div>

        {generation.status === "processing" && (
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${generation.progress}%` }}
            />
          </div>
        )}

        {generation.status === "completed" && generation.audioFileUrl && (
          <SpeechGenerationPlayer
            audioUrl={generation.audioFileUrl}
            duration={
              generation.durationMs ? generation.durationMs / 1000 : undefined
            }
          />
        )}

        {generation.status === "failed" && generation.errorMessage && (
          <p className="text-sm text-destructive">{generation.errorMessage}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{PROVIDER_LABELS[generation.provider] ?? generation.provider}</span>
          <span>{generation.voiceId}</span>
          {generation.model && <span>{generation.model}</span>}
          {generation.durationMs != null && (
            <span>{formatDuration(generation.durationMs)}</span>
          )}
          {generation.fileSizeBytes != null && (
            <span>{formatSize(generation.fileSizeBytes)}</span>
          )}
          {generation.costUsd && <span>${generation.costUsd}</span>}
        </div>

        <div className="flex items-center gap-2">
          {generation.status === "failed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(generation.id)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(generation.id)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
