"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type InputNodeData = {
  label: string;
  nodeType: "input";
  [key: string]: unknown;
};

type InputNode = Node<InputNodeData>;

export function InputNode({ data, selected }: NodeProps<InputNode>) {
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-green-50 shadow-md transition-all",
        selected ? "border-green-600 shadow-lg" : "border-green-300"
      )}
    >
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-green-600" />
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <Badge variant="outline" className="text-xs border-green-600 text-green-600">
          Flow Input
        </Badge>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-green-600"
      />
    </div>
  );
}
