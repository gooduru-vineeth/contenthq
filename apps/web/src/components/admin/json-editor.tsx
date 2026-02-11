"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";

interface JsonEditorProps {
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown> | null) => void;
  placeholder?: string;
}

export function JsonEditor({ value, onChange, placeholder }: JsonEditorProps) {
  const [text, setText] = useState(() =>
    value ? JSON.stringify(value, null, 2) : ""
  );
  const [error, setError] = useState<string | null>(null);

  const handleBlur = useCallback(() => {
    if (!text.trim()) {
      setError(null);
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      setError(null);
      setText(JSON.stringify(parsed, null, 2));
      onChange(parsed);
    } catch {
      setError("Invalid JSON");
    }
  }, [text, onChange]);

  return (
    <div className="space-y-1">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder ?? '{\n  "key": "value"\n}'}
        className="min-h-[120px] font-mono text-sm"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
