"use client";

import type { FC } from "react";
import Image from "next/image";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChatEditResultsGridProps {
  results: Array<{
    modelId: string;
    modelName: string;
    provider: string;
    aspectRatio: string;
    quality: string;
    status: "pending" | "generating" | "completed" | "failed";
    generatedMediaId?: string;
    mediaUrl?: string;
    error?: string;
    generationTimeMs?: number;
  }>;
  onUseAsSource?: (mediaUrl: string, generatedMediaId: string) => void;
  onZoom?: (
    images: Array<{ url: string; prompt?: string; model?: string }>,
    index: number
  ) => void;
}

export const ChatEditResultsGrid: FC<ChatEditResultsGridProps> = ({
  results,
  onUseAsSource,
  onZoom,
}) => {
  const groupedResults = results.reduce(
    (acc, result) => {
      const key = result.modelName;
      if (!acc[key]) {
        acc[key] = {
          modelName: result.modelName,
          provider: result.provider,
          results: [],
        };
      }
      acc[key].results.push(result);
      return acc;
    },
    {} as Record<
      string,
      {
        modelName: string;
        provider: string;
        results: typeof results;
      }
    >
  );

  const formatGenerationTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedResults).map(([modelName, group]) => (
        <div key={modelName} className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{group.modelName}</h3>
            <Badge variant="outline">{group.provider}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.results.map((result) => (
              <Card key={`${result.modelId}-${result.aspectRatio}-${result.quality}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {result.aspectRatio}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {result.quality.toUpperCase()}
                      </Badge>
                    </div>
                    {result.status === "completed" && result.generationTimeMs && (
                      <span className="text-xs text-muted-foreground font-normal">
                        {formatGenerationTime(result.generationTimeMs)}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.status === "pending" && (
                    <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  )}

                  {result.status === "generating" && (
                    <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Generating...
                        </p>
                      </div>
                    </div>
                  )}

                  {result.status === "completed" && result.mediaUrl && (
                    <>
                      <div
                        className="relative aspect-square rounded-md overflow-hidden cursor-pointer group"
                        onClick={() => {
                          if (onZoom) {
                            onZoom(
                              [{ url: result.mediaUrl!, model: result.modelName }],
                              0
                            );
                          }
                        }}
                      >
                        <Image
                          src={result.mediaUrl}
                          alt={`${result.modelName} result`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                      {onUseAsSource && result.generatedMediaId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() =>
                            onUseAsSource(
                              result.mediaUrl!,
                              result.generatedMediaId!
                            )
                          }
                        >
                          Use as Source
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}

                  {result.status === "failed" && (
                    <div className="aspect-square bg-destructive/10 rounded-md flex items-center justify-center p-4">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                        <p className="text-sm text-destructive">
                          {result.error || "Generation failed"}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
