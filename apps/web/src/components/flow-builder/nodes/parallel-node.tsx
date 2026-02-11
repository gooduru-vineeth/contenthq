"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Layers, Merge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ParallelNodeData = {
  label: string;
  nodeType: "parallelFanOut" | "parallelFanIn";
  iterateField?: string;
  [key: string]: unknown;
};

type ParallelNode = Node<ParallelNodeData>;

export function ParallelNode({ data, selected }: NodeProps<ParallelNode>) {
  const isFanOut = data.nodeType === "parallelFanOut";
  const Icon = isFanOut ? Layers : Merge;

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
          <Icon className="h-4 w-4 text-purple-600" />
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <Badge variant="secondary" className="text-xs">
          {isFanOut ? "Fan-Out" : "Fan-In"}
        </Badge>

        {isFanOut && data.iterateField && (
          <div className="text-xs text-muted-foreground">
            Iterate: <code className="bg-muted px-1 rounded">{data.iterateField as string}</code>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-primary"
      />
    </div>
  );
}
