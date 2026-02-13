"use client";

import { Loader2, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INWORLD_LANG_LABELS } from "@contenthq/shared";
import type { InworldLangCode } from "@contenthq/shared";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

interface ClonedVoiceCardProps {
  voice: {
    id: string;
    name: string;
    language: string;
    status: string;
    description: string | null;
    errorMessage: string | null;
    tags: string[] | null;
    validationResults: Array<{
      langCode: string;
      warnings: string[];
      errors: string[];
      transcription: string;
    }> | null;
    createdAt: Date;
  };
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  isDeleting: boolean;
  isRetrying: boolean;
}

export function ClonedVoiceCard({
  voice,
  onDelete,
  onRetry,
  isDeleting,
  isRetrying,
}: ClonedVoiceCardProps) {
  const langLabel =
    INWORLD_LANG_LABELS[voice.language as InworldLangCode] ?? voice.language;

  const hasWarnings = voice.validationResults?.some(
    (r) => r.warnings.length > 0
  );

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{voice.name}</p>
            {voice.description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {voice.description}
              </p>
            )}
          </div>
          <div className="ml-2 flex items-center gap-1">
            {voice.status === "failed" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRetry(voice.id)}
                disabled={isRetrying}
                title="Retry cloning"
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(voice.id)}
              disabled={isDeleting}
              title="Delete voice"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {langLabel}
          </Badge>
          <Badge className={`text-xs ${STATUS_COLORS[voice.status] ?? ""}`}>
            {voice.status}
          </Badge>
          {voice.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {voice.status === "failed" && voice.errorMessage && (
          <p className="text-xs text-destructive">{voice.errorMessage}</p>
        )}

        {voice.status === "processing" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Cloning in progress...
          </div>
        )}

        {hasWarnings && (
          <div className="flex items-start gap-1.5 text-xs text-yellow-700">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {voice.validationResults
                ?.flatMap((r) => r.warnings)
                .join("; ")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
