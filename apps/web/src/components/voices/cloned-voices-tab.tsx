"use client";

import { useState } from "react";
import { Plus, Dna } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClonedVoiceCard } from "./cloned-voice-card";
import { CloneVoiceDialog } from "./clone-voice-dialog";

export function ClonedVoicesTab() {
  const utils = trpc.useUtils();
  const { data: voices, isLoading } = trpc.voiceClone.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteMutation = trpc.voiceClone.delete.useMutation({
    onSuccess: () => {
      utils.voiceClone.list.invalidate();
      utils.voice.getClonedVoices.invalidate();
    },
  });

  const retryMutation = trpc.voiceClone.retry.useMutation({
    onSuccess: () => utils.voiceClone.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Clone Voice
        </Button>
      </div>

      {!voices || voices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Dna className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No cloned voices</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Clone a voice from an audio sample to use with Inworld TTS.
          </p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Clone Your First Voice
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((voice) => (
            <ClonedVoiceCard
              key={voice.id}
              voice={voice}
              onDelete={(id) => deleteMutation.mutate({ id })}
              onRetry={(id) => retryMutation.mutate({ id })}
              isDeleting={deleteMutation.isPending}
              isRetrying={retryMutation.isPending}
            />
          ))}
        </div>
      )}

      <CloneVoiceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
