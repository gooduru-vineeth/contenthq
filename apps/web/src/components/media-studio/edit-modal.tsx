"use client";

import type { FC } from "react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EditModalProps {
  mediaId: string;
  mediaUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditModal: FC<EditModalProps> = ({
  mediaId,
  mediaUrl,
  open,
  onOpenChange,
}) => {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [strength, setStrength] = useState([0.5]);

  const utils = trpc.useUtils();

  // Fetch editable models (image models only for now)
  const { data: models, isLoading: modelsLoading } =
    trpc.mediaGeneration.getModels.useQuery(
      { type: "image" },
      { enabled: open }
    );

  // Filter for editable models
  const editableModels = useMemo(
    () => models?.filter((m) => m.capabilities.supportsEditing && m.available) || [],
    [models]
  );

  // Use the selected model or default to first available
  const effectiveSelectedModel = useMemo(
    () => selectedModel || (editableModels.length > 0 ? editableModels[0]?.id || "" : ""),
    [selectedModel, editableModels]
  );

  const editMutation = trpc.mediaGeneration.edit.useMutation({
    onSuccess: () => {
      toast.success("Edit started successfully");
      void utils.mediaGeneration.list.invalidate();
      void utils.mediaGeneration.getById.invalidate({ id: mediaId });
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start edit");
    },
  });

  const handleClose = () => {
    setPrompt("");
    setStrength([0.5]);
    setSelectedModel("");
    onOpenChange(false);
  };

  const handleEdit = () => {
    if (!prompt.trim()) {
      toast.error("Please enter an edit prompt");
      return;
    }

    if (!effectiveSelectedModel) {
      toast.error("Please select a model");
      return;
    }

    editMutation.mutate({
      mediaId,
      editPrompt: prompt.trim(),
      model: effectiveSelectedModel,
      strength: strength[0] || 0.5,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Image Preview */}
          <div className="space-y-2">
            <Label>Current Image</Label>
            <div className="rounded-lg border overflow-hidden relative w-full aspect-square">
              <Image
                src={mediaUrl}
                alt="Current media"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
          </div>

          {/* Edit Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-prompt">Edit Instructions</Label>
              <span className="text-xs text-muted-foreground">
                {prompt.length} / 4000
              </span>
            </div>
            <Textarea
              id="edit-prompt"
              placeholder="Describe what changes you want to make to the image..."
              value={prompt}
              onChange={(e) => {
                if (e.target.value.length <= 4000) {
                  setPrompt(e.target.value);
                }
              }}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Example: "Add a sunset in the background", "Make it more
              colorful", "Add snow to the scene"
            </p>
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <Label htmlFor="edit-model">Model</Label>
            {modelsLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading models...
              </div>
            ) : editableModels.length === 0 ? (
              <div className="text-sm text-destructive">
                No editable models available
              </div>
            ) : (
              <Select value={effectiveSelectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="edit-model">
                  <SelectValue placeholder="Select an edit model" />
                </SelectTrigger>
                <SelectContent>
                  {editableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {model.provider}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Strength Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-strength">Edit Strength</Label>
              <span className="text-sm text-muted-foreground">
                {strength[0]?.toFixed(2)}
              </span>
            </div>
            <Slider
              id="edit-strength"
              value={strength}
              onValueChange={setStrength}
              min={0}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              Lower values preserve more of the original image, higher values
              make more dramatic changes
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={editMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEdit}
            disabled={
              editMutation.isPending ||
              !prompt.trim() ||
              !effectiveSelectedModel ||
              editableModels.length === 0
            }
          >
            {editMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Apply Edit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
