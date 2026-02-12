"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { FlowNodeData } from "@contenthq/shared";
import { NODE_CONFIG_MAP } from "./node-configs";

interface NodeConfigPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, updates: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  if (!node) {
    return null;
  }

  const data = node.data as FlowNodeData;

  const handleUpdate = (field: string, value: unknown) => {
    onUpdate(node.id, { [field]: value });
  };

  const ConfigComponent = NODE_CONFIG_MAP[data.nodeType];

  return (
    <Card className="w-[350px] h-full border-l rounded-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Node Configuration</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-4 space-y-4">
            {/* Common Fields */}
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={data.label || ""}
                onChange={(e) => handleUpdate("label", e.target.value)}
                placeholder="Node label"
              />
            </div>

            <div className="space-y-2">
              <Label>Node Type</Label>
              <Input value={data.nodeType || ""} disabled className="bg-muted" />
            </div>

            <Separator />

            {/* Node-type-specific config */}
            {ConfigComponent && (
              <ConfigComponent data={data} onUpdate={handleUpdate} />
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
