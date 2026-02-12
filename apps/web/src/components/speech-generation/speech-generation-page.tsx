"use client";

import { SpeechGenerationCreateDialog } from "./speech-generation-create-dialog";
import { SpeechGenerationBatchDialog } from "./speech-generation-batch-dialog";
import { SpeechGenerationList } from "./speech-generation-list";

export function SpeechGenerationPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Speech Generations
          </h1>
          <p className="text-muted-foreground">
            Generate and manage text-to-speech audio with multiple AI providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SpeechGenerationBatchDialog />
          <SpeechGenerationCreateDialog />
        </div>
      </div>

      <SpeechGenerationList />
    </div>
  );
}
