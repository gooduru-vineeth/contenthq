"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NodeConfigProps } from "./types";

export function ConditionConfig({ data, onUpdate }: NodeConfigProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="conditionExpression">Expression</Label>
      <Textarea
        id="conditionExpression"
        value={data.conditionExpression || ""}
        onChange={(e) => onUpdate("conditionExpression", e.target.value)}
        placeholder="e.g., output.status === 'success'"
        rows={3}
      />
      <p className="text-xs text-muted-foreground">
        JavaScript expression evaluated at runtime
      </p>
    </div>
  );
}
