"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ProviderVoiceSelector } from "./provider-voice-selector";

interface GenerationConfig {
  id: string;
  provider: string;
  voiceId: string;
  model: string;
}

export function SpeechGenerationBatchDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [configs, setConfigs] = useState<GenerationConfig[]>([
    { id: crypto.randomUUID(), provider: "openai", voiceId: "alloy", model: "" },
  ]);

  const utils = trpc.useUtils();

  const createBatchMutation = trpc.speechGeneration.createBatch.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Batch started: ${result.generations.length} generations`
      );
      utils.speechGeneration.list.invalidate();
      setOpen(false);
      setText("");
      setTitle("");
      setConfigs([
        { id: crypto.randomUUID(), provider: "openai", voiceId: "alloy", model: "" },
      ]);
    },
    onError: (error) => {
      toast.error(`Batch failed: ${error.message}`);
    },
  });

  const addConfig = () => {
    setConfigs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), provider: "openai", voiceId: "alloy", model: "" },
    ]);
  };

  const removeConfig = (id: string) => {
    if (configs.length <= 1) return;
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  const updateConfig = (
    id: string,
    field: keyof GenerationConfig,
    value: string
  ) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = () => {
    createBatchMutation.mutate({
      text,
      title: title || undefined,
      generations: configs.map((c) => ({
        provider: c.provider as "openai" | "elevenlabs" | "google" | "google-gemini" | "inworld" | "sarvam",
        voiceId: c.voiceId,
        model: c.model || undefined,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Layers className="mr-2 h-4 w-4" />
          Batch Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Generate Speech</DialogTitle>
          <DialogDescription>
            Generate the same text with multiple providers and voices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-title">Title (optional)</Label>
            <Input
              id="batch-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Batch label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-text">Text</Label>
            <Textarea
              id="batch-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {text.length} characters
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Configurations ({configs.length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addConfig}
                disabled={configs.length >= 20}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>

            {configs.map((config, index) => (
              <div
                key={config.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">#{index + 1}</span>
                  {configs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeConfig(config.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <ProviderVoiceSelector
                  provider={config.provider}
                  voiceId={config.voiceId}
                  onProviderChange={(v) => updateConfig(config.id, "provider", v)}
                  onVoiceChange={(v) => updateConfig(config.id, "voiceId", v)}
                />

                <div className="space-y-2">
                  <Label>Model (optional)</Label>
                  <Input
                    value={config.model}
                    onChange={(e) =>
                      updateConfig(config.id, "model", e.target.value)
                    }
                    placeholder="e.g., tts-1"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              !text || configs.length === 0 || createBatchMutation.isPending
            }
          >
            {createBatchMutation.isPending
              ? "Generating..."
              : `Generate All (${configs.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
