"use client";

import { Bot, CircleCheck, CircleDot, Cog, GitBranch, Layers, Merge, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { FlowNodeType } from "@contenthq/shared";

interface NodeTypeDefinition {
  type: FlowNodeType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const NODE_TYPES: NodeTypeDefinition[] = [
  { type: "input", label: "Input", icon: CircleDot, color: "text-green-600" },
  { type: "output", label: "Output", icon: CircleCheck, color: "text-red-600" },
  { type: "agent", label: "Agent", icon: Bot, color: "text-primary" },
  { type: "builtin", label: "Built-in Action", icon: Cog, color: "text-blue-600" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "text-amber-600" },
  { type: "parallelFanOut", label: "Fan-Out", icon: Layers, color: "text-purple-600" },
  { type: "parallelFanIn", label: "Fan-In", icon: Merge, color: "text-purple-600" },
  { type: "delay", label: "Delay / Approval", icon: Timer, color: "text-slate-600" },
];

export function NodeSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: FlowNodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card className="w-[280px] h-full border-r rounded-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Node Types</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-4 space-y-2">
            {NODE_TYPES.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 border-dashed",
                    "cursor-grab active:cursor-grabbing",
                    "hover:border-primary hover:bg-accent transition-colors"
                  )}
                >
                  <Icon className={cn("h-5 w-5", node.color)} />
                  <span className="text-sm font-medium">{node.label}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
