"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ProviderVoiceSelector } from "./provider-voice-selector";

export function SpeechGenerationCreateDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [provider, setProvider] = useState("openai");
  const [voiceId, setVoiceId] = useState("");
  const [model, setModel] = useState("");
  const [title, setTitle] = useState("");
  const [speed, setSpeed] = useState("1");
  const [audioFormat, setAudioFormat] = useState("mp3");

  const utils = trpc.useUtils();

  const { data: costEstimate } = trpc.speechGeneration.estimateCost.useQuery(
    { text, provider, voiceId },
    { enabled: text.length > 0 && !!provider && !!voiceId }
  );

  const createMutation = trpc.speechGeneration.create.useMutation({
    onSuccess: () => {
      toast.success("Speech generation started");
      utils.speechGeneration.list.invalidate();
      setOpen(false);
      setText("");
      setTitle("");
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    createMutation.mutate({
      text,
      provider: provider as "openai" | "elevenlabs" | "google" | "google-gemini" | "inworld" | "sarvam",
      voiceId,
      model: model || undefined,
      title: title || undefined,
      audioFormat,
      voiceSettings: {
        speed: parseFloat(speed) || 1,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Generate Speech
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Speech</DialogTitle>
          <DialogDescription>
            Convert text to speech using AI providers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sg-title">Title (optional)</Label>
            <Input
              id="sg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this generation a label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sg-text">Text</Label>
            <Textarea
              id="sg-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              {text.length} characters
            </p>
          </div>

          <ProviderVoiceSelector
            provider={provider}
            voiceId={voiceId}
            onProviderChange={setProvider}
            onVoiceChange={setVoiceId}
          />

          <div className="space-y-2">
            <Label htmlFor="sg-model">Model (optional)</Label>
            <Input
              id="sg-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g., tts-1, tts-1-hd, gpt-4o-mini-tts"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sg-speed">Speed</Label>
              <Input
                id="sg-speed"
                type="number"
                min="0.25"
                max="4"
                step="0.25"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={audioFormat} onValueChange={setAudioFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3">MP3</SelectItem>
                  <SelectItem value="wav">WAV</SelectItem>
                  <SelectItem value="opus">Opus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {costEstimate && costEstimate.estimatedCost > 0 && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              Estimated cost: ${costEstimate.estimatedCost.toFixed(4)}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!text || !voiceId || createMutation.isPending}
          >
            {createMutation.isPending ? "Generating..." : "Generate Speech"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
