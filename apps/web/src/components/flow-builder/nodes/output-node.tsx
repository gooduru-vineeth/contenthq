"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OutputNodeData = {
  label: string;
  nodeType: "output";
  [key: string]: unknown;
};

type OutputNode = Node<OutputNodeData>;

export function OutputNode({ data, selected }: NodeProps<OutputNode>) {
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-red-50 shadow-md transition-all",
        selected ? "border-red-600 shadow-lg" : "border-red-300"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-red-600"
      />

      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <CircleCheck className="h-4 w-4 text-red-600" />
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <Badge variant="outline" className="text-xs border-red-600 text-red-600">
          Flow Output
        </Badge>
      </div>
    </div>
  );
}
