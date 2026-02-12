"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { NodeConfigProps } from "./types";

export function ParallelConfig({ data, onUpdate }: NodeConfigProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="iterateField">Iterate Field</Label>
      <Input
        id="iterateField"
        value={data.iterateField || ""}
        onChange={(e) => onUpdate("iterateField", e.target.value)}
        placeholder="e.g., scenes"
      />
      <p className="text-xs text-muted-foreground">
        Data field containing array to iterate over
      </p>
    </div>
  );
}
