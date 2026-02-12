"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { AudioLines, Cog, FileText, Mic, Music, Video, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BuiltinAction = "ingestion" | "tts_generation" | "audio_mixing" | "video_assembly" | "video_generation" | "speech_generation" | "media_generation";

type BuiltinNodeData = {
  label: string;
  nodeType: "builtin";
  builtinAction?: BuiltinAction;
  [key: string]: unknown;
};

type BuiltinNode = Node<BuiltinNodeData>;

const BUILTIN_ACTION_ICONS: Record<BuiltinAction, React.ComponentType<{ className?: string }>> = {
  ingestion: FileText,
  tts_generation: Mic,
  audio_mixing: Music,
  video_assembly: Video,
  video_generation: Video,
  speech_generation: AudioLines,
  media_generation: Wand2,
};

const BUILTIN_ACTION_LABELS: Record<BuiltinAction, string> = {
  ingestion: "Ingestion",
  tts_generation: "Text-to-Speech",
  audio_mixing: "Audio Mixing",
  video_assembly: "Video Assembly",
  video_generation: "Video Generation",
  speech_generation: "Speech Generation",
  media_generation: "Media Generation",
};

export function BuiltinNode({ data, selected }: NodeProps<BuiltinNode>) {
  const action = data.builtinAction as BuiltinAction | undefined;
  const Icon = action ? BUILTIN_ACTION_ICONS[action] : Cog;
  const actionLabel = action ? BUILTIN_ACTION_LABELS[action] : "Built-in Action";

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
          <Icon className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <Badge variant="outline" className="text-xs">
          {actionLabel}
        </Badge>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-primary"
      />
    </div>
  );
}
