"use client";

import type { FC } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultiModelSelectorProps {
  models: Array<{
    id: string;
    name: string;
    provider: string;
    capabilities: { supportsEditing: boolean; supportsStyle: boolean };
  }>;
  selectedModels: string[];
  onChange: (models: string[]) => void;
  disabled?: boolean;
  maxSelectable?: number;
}

export const MultiModelSelector: FC<MultiModelSelectorProps> = ({
  models,
  selectedModels,
  onChange,
  disabled = false,
  maxSelectable = 5,
}) => {
  const groupedModels = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, typeof models>
  );

  const handleToggle = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      onChange(selectedModels.filter((id) => id !== modelId));
    } else {
      if (selectedModels.length < maxSelectable) {
        onChange([...selectedModels, modelId]);
      }
    }
  };

  const isMaxReached = selectedModels.length >= maxSelectable;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Selected {selectedModels.length} / {maxSelectable} models
        </p>
      </div>

      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-6">
          {Object.entries(groupedModels).map(([provider, providerModels]) => (
            <div key={provider} className="space-y-3">
              <h3 className="font-semibold text-sm">{provider}</h3>
              <div className="space-y-2">
                {providerModels.map((model) => {
                  const isSelected = selectedModels.includes(model.id);
                  const isDisabled =
                    disabled || (isMaxReached && !isSelected);

                  return (
                    <div
                      key={model.id}
                      className="flex items-start space-x-3 rounded-md border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={model.id}
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(model.id)}
                        disabled={isDisabled}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={model.id}
                          className={
                            isDisabled
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-pointer"
                          }
                        >
                          {model.name}
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {model.provider}
                          </Badge>
                          {model.capabilities.supportsEditing && (
                            <Badge variant="secondary" className="text-xs">
                              Edit
                            </Badge>
                          )}
                          {model.capabilities.supportsStyle && (
                            <Badge variant="secondary" className="text-xs">
                              Style
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
