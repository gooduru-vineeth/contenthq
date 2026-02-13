"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Variation {
  id: string;
  name: string;
  description: string;
}

interface VariationCardProps {
  variation: Variation;
  onUpdate: (updates: Partial<Variation>) => void;
  onRemove: () => void;
}

export function VariationCard({
  variation,
  onUpdate,
  onRemove,
}: VariationCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={variation.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="h-8 text-sm"
              placeholder="Variation name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={variation.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="h-16 text-xs"
              placeholder="What makes this variation different..."
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="ml-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
