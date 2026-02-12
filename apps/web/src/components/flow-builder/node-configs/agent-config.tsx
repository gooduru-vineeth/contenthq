"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NodeConfigProps } from "./types";

export function AgentConfig({ data, onUpdate }: NodeConfigProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="agentId">Agent</Label>
      <Select
        value={data.agentId || ""}
        onValueChange={(value) => onUpdate("agentId", value)}
      >
        <SelectTrigger id="agentId">
          <SelectValue placeholder="Select agent..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="scriptwriter">Scriptwriter</SelectItem>
          <SelectItem value="content-analyzer">Content Analyzer</SelectItem>
          <SelectItem value="seo-optimizer">SEO Optimizer</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
