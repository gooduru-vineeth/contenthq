"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ConditionNodeData = {
  label: string;
  nodeType: "condition";
  conditionExpression?: string;
  [key: string]: unknown;
};

type ConditionNode = Node<ConditionNodeData>;

export function ConditionNode({ data, selected }: NodeProps<ConditionNode>) {
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected ? "border-primary shadow-lg" : "border-border"
      )}
      style={{
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-primary"
      />

      <div className="space-y-2 p-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <GitBranch className="h-4 w-4 text-amber-600" />
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <Badge variant="secondary" className="text-xs">
          Condition
        </Badge>

        {data.conditionExpression && (
          <code className="block text-xs text-muted-foreground truncate max-w-[150px]">
            {data.conditionExpression as string}
          </code>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!h-3 !w-3 !bg-green-600 !-bottom-[6px] !left-[30%]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!h-3 !w-3 !bg-red-600 !-bottom-[6px] !left-[70%]"
      />
    </div>
  );
}
