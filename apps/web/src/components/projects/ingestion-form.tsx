"use client";

import { useState } from "react";
import { Loader2, Link as LinkIcon, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface IngestionFormProps {
  onSubmit: (data: { inputType: string; inputContent: string }) => void;
  isLoading?: boolean;
}

function detectInputType(value: string): "url" | "topic" {
  try {
    new URL(value);
    return "url";
  } catch {
    return value.match(/^https?:\/\//) ? "url" : "topic";
  }
}

export function IngestionForm({ onSubmit, isLoading }: IngestionFormProps) {
  const [value, setValue] = useState("");

  const inputType = value.trim() ? detectInputType(value.trim()) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit({
      inputType: detectInputType(trimmed),
      inputContent: trimmed,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Input
          placeholder="Paste a URL or enter a topic..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isLoading}
          className="pr-10"
        />
        {inputType && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {inputType === "url" ? (
              <LinkIcon className="h-4 w-4" />
            ) : (
              <Type className="h-4 w-4" />
            )}
          </div>
        )}
      </div>
      {inputType && (
        <p className="text-xs text-muted-foreground">
          Detected as: <span className="font-medium capitalize">{inputType}</span>
        </p>
      )}
      <Button type="submit" disabled={!value.trim() || isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </form>
  );
}
