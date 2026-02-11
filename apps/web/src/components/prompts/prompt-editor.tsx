"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  const unique = new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")));
  return Array.from(unique);
}

export function PromptEditor({ value, onChange, disabled }: PromptEditorProps) {
  const variables = useMemo(() => extractVariables(value), [value]);

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Enter prompt content... Use {{variableName}} for dynamic variables."
        className={cn("min-h-[200px] font-mono text-sm", disabled && "opacity-60")}
      />
      {variables.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Variables:</span>
          {variables.map((v) => (
            <Badge key={v} variant="secondary" className="font-mono text-xs">
              {`{{${v}}}`}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
