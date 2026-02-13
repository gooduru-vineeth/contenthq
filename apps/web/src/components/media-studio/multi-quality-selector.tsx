"use client";

import type { FC } from "react";
import { Button } from "@/components/ui/button";

interface MultiQualitySelectorProps {
  selectedQualities: string[];
  onChange: (qualities: string[]) => void;
  disabled?: boolean;
}

const QUALITIES = [
  { value: "standard", label: "Standard" },
  { value: "hd", label: "HD" },
] as const;

export const MultiQualitySelector: FC<MultiQualitySelectorProps> = ({
  selectedQualities,
  onChange,
  disabled = false,
}) => {
  const handleToggle = (quality: string) => {
    if (selectedQualities.includes(quality)) {
      if (selectedQualities.length > 1) {
        onChange(selectedQualities.filter((q) => q !== quality));
      }
    } else {
      onChange([...selectedQualities, quality]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Selected {selectedQualities.length} quality option
        {selectedQualities.length !== 1 ? "s" : ""}
      </p>
      <div className="flex gap-3">
        {QUALITIES.map((quality) => {
          const isSelected = selectedQualities.includes(quality.value);
          const isOnlySelected =
            isSelected && selectedQualities.length === 1;

          return (
            <Button
              key={quality.value}
              variant={isSelected ? "default" : "outline"}
              onClick={() => handleToggle(quality.value)}
              disabled={disabled || isOnlySelected}
              className="flex-1"
            >
              {quality.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
