"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUILTIN_ACTIONS } from "@contenthq/shared";
import type { NodeConfigProps } from "./types";
import { SpeechGenerationConfig } from "./speech-generation-config";
import { MediaGenerationConfig } from "./media-generation-config";

export function BuiltinConfig({ data, onUpdate }: NodeConfigProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="builtinAction">Action</Label>
        <Select
          value={data.builtinAction || ""}
          onValueChange={(value) => onUpdate("builtinAction", value)}
        >
          <SelectTrigger id="builtinAction">
            <SelectValue placeholder="Select action..." />
          </SelectTrigger>
          <SelectContent>
            {BUILTIN_ACTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.builtinAction === "speech_generation" && (
        <SpeechGenerationConfig data={data} onUpdate={onUpdate} />
      )}

      {data.builtinAction === "media_generation" && (
        <MediaGenerationConfig data={data} onUpdate={onUpdate} />
      )}
    </>
  );
}
