"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { NodeConfigProps } from "./types";

export function MediaGenerationConfig({ data, onUpdate }: NodeConfigProps) {
  const config = data.config as Record<string, unknown> | undefined;

  const updateConfig = (field: string, value: unknown) => {
    onUpdate("config", { ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mg-mediaType">Media Type</Label>
        <Select
          value={(config?.mediaType as string) || "image"}
          onValueChange={(value: string) => updateConfig("mediaType", value)}
        >
          <SelectTrigger id="mg-mediaType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mg-model">Model</Label>
        <Input
          id="mg-model"
          value={(config?.model as string) || ""}
          onChange={(e) => updateConfig("model", e.target.value)}
          placeholder="e.g., dall-e-3, gpt-image-1"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mg-provider">Provider</Label>
        <Select
          value={(config?.provider as string) || "openai"}
          onValueChange={(value: string) => updateConfig("provider", value)}
        >
          <SelectTrigger id="mg-provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="replicate">Replicate</SelectItem>
            <SelectItem value="fal">fal.ai</SelectItem>
            <SelectItem value="google">Google</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mg-aspectRatio">Aspect Ratio</Label>
        <Select
          value={(config?.aspectRatio as string) || "1:1"}
          onValueChange={(value: string) => updateConfig("aspectRatio", value)}
        >
          <SelectTrigger id="mg-aspectRatio">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 (Square)</SelectItem>
            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="3:4">3:4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mg-quality">Quality</Label>
        <Select
          value={(config?.quality as string) || "standard"}
          onValueChange={(value: string) => updateConfig("quality", value)}
        >
          <SelectTrigger id="mg-quality">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="hd">HD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(config?.mediaType as string) === "video" && (
        <div className="space-y-2">
          <Label htmlFor="mg-duration">Duration (seconds)</Label>
          <Input
            id="mg-duration"
            type="number"
            min={1}
            max={30}
            value={(config?.duration as number) || 5}
            onChange={(e) =>
              updateConfig("duration", parseInt(e.target.value) || 5)
            }
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="mg-prompt">Prompt</Label>
        <Textarea
          id="mg-prompt"
          value={(config?.prompt as string) || ""}
          onChange={(e) => updateConfig("prompt", e.target.value)}
          placeholder="Describe the media to generate, or leave empty to use upstream input"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to use prompt from upstream node output
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mg-count">Count</Label>
        <Input
          id="mg-count"
          type="number"
          min={1}
          max={4}
          value={(config?.count as number) || 1}
          onChange={(e) =>
            updateConfig("count", parseInt(e.target.value) || 1)
          }
        />
      </div>
    </div>
  );
}
