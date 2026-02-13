"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, Upload, X, Music } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  INWORLD_LANG_CODES,
  INWORLD_LANG_LABELS,
} from "@contenthq/shared";
import type { InworldLangCode } from "@contenthq/shared";

interface CloneVoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "details" | "upload" | "clone";

interface AudioFile {
  file: File;
  duration: number | null;
  error: string | null;
  warning: string | null;
}

const MAX_FILES = 3;
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/webm", "audio/x-wav"];

async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read audio file"));
    });
    audio.src = url;
  });
}

export function CloneVoiceDialog({
  open,
  onOpenChange,
}: CloneVoiceDialogProps) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<Step>("details");

  // Step 1: Details
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<InworldLangCode>("EN_US");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [removeNoise, setRemoveNoise] = useState(false);

  // Step 2: Upload
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Clone
  const [createdVoiceId, setCreatedVoiceId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const createMutation = trpc.voiceClone.create.useMutation();
  const cloneMutation = trpc.voiceClone.clone.useMutation({
    onSuccess: () => {
      utils.voiceClone.list.invalidate();
      utils.voice.getClonedVoices.invalidate();
      handleClose();
    },
    onError: (err) => {
      setCloneError(err.message);
    },
  });

  const [isUploading, setIsUploading] = useState(false);

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setStep("details");
      setName("");
      setLanguage("EN_US");
      setDescription("");
      setTagInput("");
      setTags([]);
      setRemoveNoise(false);
      setAudioFiles([]);
      setCreatedVoiceId(null);
      setUploadError(null);
      setCloneError(null);
    }, 200);
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const newFiles: AudioFile[] = [];
    for (const file of Array.from(files)) {
      if (audioFiles.length + newFiles.length >= MAX_FILES) break;

      if (!ALLOWED_TYPES.includes(file.type)) {
        newFiles.push({ file, duration: null, error: "Unsupported format. Use WAV, MP3, or WebM.", warning: null });
        continue;
      }

      try {
        const duration = await getAudioDuration(file);
        const durationError =
          duration < 5
            ? "Audio must be at least 5 seconds"
            : null;
        const durationWarning =
          duration > 15
            ? "Audio longer than 15s will be trimmed automatically"
            : null;
        newFiles.push({ file, duration, error: durationError, warning: durationWarning });
      } catch {
        newFiles.push({ file, duration: null, error: "Could not read audio duration", warning: null });
      }
    }

    setAudioFiles((prev) => [...prev, ...newFiles].slice(0, MAX_FILES));
  }, [audioFiles.length]);

  function removeFile(index: number) {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const validFiles = audioFiles.filter((f) => !f.error);
  const canProceedToUpload = name.trim().length > 0;
  const canProceedToClone = validFiles.length > 0;

  async function handleCreateAndUpload() {
    setUploadError(null);

    try {
      const voice = await createMutation.mutateAsync({
        name: name.trim(),
        language,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        removeBackgroundNoise: removeNoise ? "true" : "false",
      });

      setCreatedVoiceId(voice.id);
      setIsUploading(true);

      const formData = new FormData();
      formData.append("clonedVoiceId", voice.id);
      for (const af of validFiles) {
        formData.append("files", af.file);
      }

      const resp = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/voice-clone-upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(data.error || "Upload failed");
      }

      const result = await resp.json();
      if (result.failed > 0) {
        setUploadError(
          `${result.failed} file(s) failed to upload: ${result.errors.map((e: { error: string }) => e.error).join(", ")}`
        );
      }

      setIsUploading(false);
      setStep("clone");
    } catch (err) {
      setIsUploading(false);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleClone() {
    if (!createdVoiceId) return;
    setCloneError(null);
    cloneMutation.mutate({ id: createdVoiceId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "details" && "Clone Voice - Details"}
            {step === "upload" && "Clone Voice - Audio Samples"}
            {step === "clone" && "Clone Voice - Confirm"}
          </DialogTitle>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Voice"
              />
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as InworldLangCode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INWORLD_LANG_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {INWORLD_LANG_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this voice"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                >
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="noise-removal">Remove background noise</Label>
              <Switch
                id="noise-removal"
                checked={removeNoise}
                onCheckedChange={setRemoveNoise}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("upload")}
                disabled={!canProceedToUpload}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload 1-3 audio samples (WAV, MP3, or WebM). Each should be at
              least 5 seconds of clear speech. For best results, use 10-15
              second clips; longer audio will be trimmed automatically.
            </p>

            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFileSelect(e.dataTransfer.files);
              }}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Click or drag audio files here
              </p>
              <p className="text-xs text-muted-foreground">
                Max {MAX_FILES} files, 16MB total
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.mp3,.webm,audio/wav,audio/mpeg,audio/webm"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {audioFiles.length > 0 && (
              <div className="space-y-2">
                {audioFiles.map((af, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{af.file.name}</p>
                        {af.duration != null && (
                          <p className="text-xs text-muted-foreground">
                            {af.duration.toFixed(1)}s
                          </p>
                        )}
                        {af.error && (
                          <p className="text-xs text-destructive">{af.error}</p>
                        )}
                        {!af.error && af.warning && (
                          <p className="text-xs text-amber-500">{af.warning}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <Button
                onClick={handleCreateAndUpload}
                disabled={
                  !canProceedToClone ||
                  createMutation.isPending ||
                  isUploading
                }
              >
                {(createMutation.isPending || isUploading) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Upload Samples
              </Button>
            </div>
          </div>
        )}

        {step === "clone" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Language</span>
                <span>{INWORLD_LANG_LABELS[language]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Samples</span>
                <span>{validFiles.length} file(s)</span>
              </div>
              {removeNoise && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Noise removal</span>
                  <span>Enabled</span>
                </div>
              )}
            </div>

            {cloneError && (
              <p className="text-sm text-destructive">{cloneError}</p>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleClone}
                disabled={cloneMutation.isPending}
              >
                {cloneMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Clone Voice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
