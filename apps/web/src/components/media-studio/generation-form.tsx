"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { ModelSelector } from "./model-selector";

type MediaType = "image" | "video";
type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type Quality = "standard" | "hd";

export function GenerationForm() {
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [multiModelMode, setMultiModelMode] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<Quality>("standard");
  const [duration, setDuration] = useState([5]);
  const [count, setCount] = useState(1);

  const utils = trpc.useUtils();

  const generateMutation = trpc.mediaGeneration.generate.useMutation({
    onSuccess: () => {
      toast.success("Generation started successfully");
      setPrompt("");
      void utils.mediaGeneration.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start generation");
    },
  });

  const generateMultiModelMutation =
    trpc.mediaGeneration.generateMultiModel.useMutation({
      onSuccess: () => {
        toast.success("Multi-model generation started successfully");
        setPrompt("");
        void utils.mediaGeneration.list.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start multi-model generation");
      },
    });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (selectedModels.length === 0) {
      toast.error("Please select at least one model");
      return;
    }

    const baseParams = {
      prompt: prompt.trim(),
      mediaType,
      aspectRatio,
      count,
      ...(mediaType === "image" && { quality }),
      ...(mediaType === "video" && { duration: duration[0] }),
    };

    if (multiModelMode) {
      generateMultiModelMutation.mutate({
        ...baseParams,
        models: selectedModels,
        aspectRatios: [aspectRatio],
        ...(mediaType === "image" && { qualities: [quality] }),
      });
    } else {
      generateMutation.mutate({
        ...baseParams,
        model: selectedModels[0] as string,
      });
    }
  };

  const isPending =
    generateMutation.isPending || generateMultiModelMutation.isPending;

  const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Media Type Toggle */}
        <div className="space-y-2">
          <Label>Media Type</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mediaType === "image" ? "default" : "outline"}
              onClick={() => {
                setMediaType("image");
                setSelectedModels([]);
              }}
            >
              Image
            </Button>
            <Button
              type="button"
              variant={mediaType === "video" ? "default" : "outline"}
              onClick={() => {
                setMediaType("video");
                setSelectedModels([]);
              }}
            >
              Video
            </Button>
          </div>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt">Prompt</Label>
            <span className="text-xs text-muted-foreground">
              {prompt.length} / 4000
            </span>
          </div>
          <Textarea
            id="prompt"
            placeholder="Describe the image or video you want to generate..."
            value={prompt}
            onChange={(e) => {
              if (e.target.value.length <= 4000) {
                setPrompt(e.target.value);
              }
            }}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Multi-Model Mode Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="multi-model">Multi-Model Mode</Label>
            <p className="text-sm text-muted-foreground">
              Generate with multiple models simultaneously
            </p>
          </div>
          <Switch
            id="multi-model"
            checked={multiModelMode}
            onCheckedChange={(checked) => {
              setMultiModelMode(checked);
              if (!checked && selectedModels.length > 1) {
                setSelectedModels([selectedModels[0] as string]);
              }
            }}
          />
        </div>

        {/* Model Selector */}
        <div className="space-y-2">
          <Label>
            {multiModelMode ? "Select Models" : "Select Model"}
          </Label>
          <ModelSelector
            mediaType={mediaType}
            selectedModels={selectedModels}
            onModelsChange={setSelectedModels}
            multiSelect={multiModelMode}
          />
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <div className="flex flex-wrap gap-2">
            {aspectRatios.map((ratio) => (
              <Button
                key={ratio}
                type="button"
                variant={aspectRatio === ratio ? "default" : "outline"}
                onClick={() => setAspectRatio(ratio)}
                size="sm"
              >
                {ratio}
              </Button>
            ))}
          </div>
        </div>

        {/* Quality (Image Only) */}
        {mediaType === "image" && (
          <div className="space-y-2">
            <Label>Quality</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={quality === "standard" ? "default" : "outline"}
                onClick={() => setQuality("standard")}
                size="sm"
              >
                Standard
              </Button>
              <Button
                type="button"
                variant={quality === "hd" ? "default" : "outline"}
                onClick={() => setQuality("hd")}
                size="sm"
              >
                HD
              </Button>
            </div>
          </div>
        )}

        {/* Duration (Video Only) */}
        {mediaType === "video" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Duration</Label>
              <span className="text-sm text-muted-foreground">
                {duration[0]} seconds
              </span>
            </div>
            <Slider
              value={duration}
              onValueChange={setDuration}
              min={1}
              max={30}
              step={1}
            />
          </div>
        )}

        {/* Count */}
        <div className="space-y-2">
          <Label htmlFor="count">Number of Generations</Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={4}
            value={count}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 4) {
                setCount(val);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Generate 1-4 variations
          </p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
