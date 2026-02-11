"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import type { Node } from "@xyflow/react";

const BUILTIN_ACTIONS = [
  "ingestion",
  "tts_generation",
  "audio_mixing",
  "video_assembly",
  "video_generation",
] as const;

interface NodeConfigPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, updates: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  if (!node) {
    return null;
  }

  const data = node.data as Record<string, unknown>;

  const handleUpdate = (field: string, value: unknown) => {
    onUpdate(node.id, { [field]: value });
  };

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
                value={(data.label as string) || ""}
                onChange={(e) => handleUpdate("label", e.target.value)}
                placeholder="Node label"
              />
            </div>

            <div className="space-y-2">
              <Label>Node Type</Label>
              <Input value={(data.nodeType as string) || ""} disabled className="bg-muted" />
            </div>

            <Separator />

            {/* Agent Node Config */}
            {data.nodeType === "agent" && (
              <div className="space-y-2">
                <Label htmlFor="agentId">Agent</Label>
                <Select
                  value={(data.agentId as string) || ""}
                  onValueChange={(value) => handleUpdate("agentId", value)}
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
            )}

            {/* Builtin Node Config */}
            {data.nodeType === "builtin" && (
              <div className="space-y-2">
                <Label htmlFor="builtinAction">Action</Label>
                <Select
                  value={(data.builtinAction as string) || ""}
                  onValueChange={(value) => handleUpdate("builtinAction", value)}
                >
                  <SelectTrigger id="builtinAction">
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILTIN_ACTIONS.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Condition Node Config */}
            {data.nodeType === "condition" && (
              <div className="space-y-2">
                <Label htmlFor="conditionExpression">Expression</Label>
                <Textarea
                  id="conditionExpression"
                  value={(data.conditionExpression as string) || ""}
                  onChange={(e) => handleUpdate("conditionExpression", e.target.value)}
                  placeholder="e.g., output.status === 'success'"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  JavaScript expression evaluated at runtime
                </p>
              </div>
            )}

            {/* Parallel Fan-Out Config */}
            {data.nodeType === "parallelFanOut" && (
              <div className="space-y-2">
                <Label htmlFor="iterateField">Iterate Field</Label>
                <Input
                  id="iterateField"
                  value={(data.iterateField as string) || ""}
                  onChange={(e) => handleUpdate("iterateField", e.target.value)}
                  placeholder="e.g., scenes"
                />
                <p className="text-xs text-muted-foreground">
                  Data field containing array to iterate over
                </p>
              </div>
            )}

            {/* Delay Node Config */}
            {data.nodeType === "delay" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delayType">Delay Type</Label>
                  <Select
                    value={((data.delayConfig as Record<string, unknown> | undefined)?.type as string) || "timer"}
                    onValueChange={(value: string) =>
                      handleUpdate("delayConfig", {
                        ...(data.delayConfig as Record<string, unknown>),
                        type: value,
                      })
                    }
                  >
                    <SelectTrigger id="delayType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="timer">Timer</SelectItem>
                      <SelectItem value="manual">Manual Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {((data.delayConfig as Record<string, unknown> | undefined)?.type) === "timer" && (
                  <div className="space-y-2">
                    <Label htmlFor="delaySeconds">Delay (seconds)</Label>
                    <Input
                      id="delaySeconds"
                      type="number"
                      value={((data.delayConfig as Record<string, unknown> | undefined)?.seconds as number) || 0}
                      onChange={(e) =>
                        handleUpdate("delayConfig", {
                          ...(data.delayConfig as Record<string, unknown>),
                          type: "timer",
                          seconds: parseInt(e.target.value) || 0,
                        })
                      }
                      min={0}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
