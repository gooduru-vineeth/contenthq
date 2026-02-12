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
  "speech_generation",
  "media_generation",
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

            {/* Speech Generation Config */}
            {data.nodeType === "builtin" &&
              data.builtinAction === "speech_generation" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sg-provider">Provider</Label>
                    <Select
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.provider as string) || "openai"
                      }
                      onValueChange={(value: string) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          provider: value,
                        })
                      }
                    >
                      <SelectTrigger id="sg-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                        <SelectItem value="google">Google Cloud</SelectItem>
                        <SelectItem value="google-gemini">
                          Google Gemini
                        </SelectItem>
                        <SelectItem value="inworld">Inworld</SelectItem>
                        <SelectItem value="sarvam">Sarvam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sg-voiceId">Voice ID</Label>
                    <Input
                      id="sg-voiceId"
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.voiceId as string) || ""
                      }
                      onChange={(e) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          voiceId: e.target.value,
                        })
                      }
                      placeholder="e.g., alloy, coral, nova"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sg-model">Model</Label>
                    <Input
                      id="sg-model"
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.model as string) || ""
                      }
                      onChange={(e) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          model: e.target.value,
                        })
                      }
                      placeholder="e.g., tts-1, tts-1-hd"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sg-text">Text (static)</Label>
                    <Textarea
                      id="sg-text"
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.text as string) || ""
                      }
                      onChange={(e) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          text: e.target.value,
                        })
                      }
                      placeholder="Enter text or leave empty to use upstream node output"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use text from upstream node output
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sg-speed">Speed</Label>
                    <Input
                      id="sg-speed"
                      type="number"
                      min={0.25}
                      max={4}
                      step={0.25}
                      value={
                        ((
                          (data.config as Record<string, unknown> | undefined)
                            ?.voiceSettings as Record<string, unknown>
                        )?.speed as number) || 1
                      }
                      onChange={(e) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          voiceSettings: {
                            ...((data.config as Record<string, unknown>)
                              ?.voiceSettings as Record<string, unknown>),
                            speed: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

            {/* Media Generation Config */}
            {data.nodeType === "builtin" &&
              data.builtinAction === "media_generation" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mg-mediaType">Media Type</Label>
                    <Select
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.mediaType as string) || "image"
                      }
                      onValueChange={(value: string) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          mediaType: value,
                        })
                      }
                    >
                      <SelectTrigger id="mg-mediaType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mg-model">Model</Label>
                    <Input
                      id="mg-model"
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.model as string) || ""
                      }
                      onChange={(e) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          model: e.target.value,
                        })
                      }
                      placeholder="e.g., dall-e-3, gpt-image-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mg-provider">Provider</Label>
                    <Select
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.provider as string) || "openai"
                      }
                      onValueChange={(value: string) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          provider: value,
                        })
                      }
                    >
                      <SelectTrigger id="mg-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="replicate">Replicate</SelectItem>
                        <SelectItem value="fal">fal.ai</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mg-aspectRatio">Aspect Ratio</Label>
                    <Select
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.aspectRatio as string) || "1:1"
                      }
                      onValueChange={(value: string) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          aspectRatio: value,
                        })
                      }
                    >
                      <SelectTrigger id="mg-aspectRatio">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                        <SelectItem value="4:3">4:3</SelectItem>
                        <SelectItem value="3:4">3:4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mg-quality">Quality</Label>
                    <Select
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.quality as string) || "standard"
                      }
                      onValueChange={(value: string) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          quality: value,
                        })
                      }
                    >
                      <SelectTrigger id="mg-quality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="hd">HD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {((data.config as Record<string, unknown> | undefined)
                    ?.mediaType as string) === "video" && (
                    <div className="space-y-2">
                      <Label htmlFor="mg-duration">Duration (seconds)</Label>
                      <Input
                        id="mg-duration"
                        type="number"
                        min={1}
                        max={30}
                        value={
                          ((data.config as Record<string, unknown> | undefined)
                            ?.duration as number) || 5
                        }
                        onChange={(e) =>
                          handleUpdate("config", {
                            ...(data.config as Record<string, unknown>),
                            duration: parseInt(e.target.value) || 5,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="mg-prompt">Prompt</Label>
                    <Textarea
                      id="mg-prompt"
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.prompt as string) || ""
                      }
                      onChange={(e) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          prompt: e.target.value,
                        })
                      }
                      placeholder="Describe the media to generate, or leave empty to use upstream input"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use prompt from upstream node output
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mg-count">Count</Label>
                    <Input
                      id="mg-count"
                      type="number"
                      min={1}
                      max={4}
                      value={
                        ((data.config as Record<string, unknown> | undefined)
                          ?.count as number) || 1
                      }
                      onChange={(e) =>
                        handleUpdate("config", {
                          ...(data.config as Record<string, unknown>),
                          count: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
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
