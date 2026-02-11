"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AgentNodeData = {
  label: string;
  nodeType: "agent";
  agentId?: string;
  [key: string]: unknown;
};

type AgentNode = Node<AgentNodeData>;

export function AgentNode({ data, selected }: NodeProps<AgentNode>) {
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected ? "border-primary shadow-lg" : "border-border"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-primary"
      />

      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <Badge variant="secondary" className="text-xs">
          Agent Execution
        </Badge>

        <Select value={(data.agentId as string) || ""}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Select agent..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scriptwriter">Scriptwriter</SelectItem>
            <SelectItem value="content-analyzer">Content Analyzer</SelectItem>
            <SelectItem value="seo-optimizer">SEO Optimizer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-primary"
      />
    </div>
  );
}
