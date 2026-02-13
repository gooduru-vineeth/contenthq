"use client";

import type { FC } from "react";
import { Button } from "@/components/ui/button";

interface MultiAspectRatioSelectorProps {
  selectedRatios: string[];
  onChange: (ratios: string[]) => void;
  disabled?: boolean;
}

const ASPECT_RATIOS = [
  { value: "1:1", width: 1, height: 1 },
  { value: "16:9", width: 16, height: 9 },
  { value: "9:16", width: 9, height: 16 },
  { value: "4:3", width: 4, height: 3 },
  { value: "3:4", width: 3, height: 4 },
  { value: "21:9", width: 21, height: 9 },
] as const;

export const MultiAspectRatioSelector: FC<MultiAspectRatioSelectorProps> = ({
  selectedRatios,
  onChange,
  disabled = false,
}) => {
  const handleToggle = (ratio: string) => {
    if (selectedRatios.includes(ratio)) {
      if (selectedRatios.length > 1) {
        onChange(selectedRatios.filter((r) => r !== ratio));
      }
    } else {
      onChange([...selectedRatios, ratio]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Selected {selectedRatios.length} aspect ratio
        {selectedRatios.length !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ASPECT_RATIOS.map((ratio) => {
          const isSelected = selectedRatios.includes(ratio.value);
          const isOnlySelected =
            isSelected && selectedRatios.length === 1;

          return (
            <Button
              key={ratio.value}
              variant={isSelected ? "default" : "outline"}
              onClick={() => handleToggle(ratio.value)}
              disabled={disabled || isOnlySelected}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <div
                className="border-2 border-current rounded"
                style={{
                  width: `${Math.min(ratio.width * 4, 40)}px`,
                  height: `${Math.min(ratio.height * 4, 40)}px`,
                }}
              />
              <span className="text-sm font-medium">{ratio.value}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
