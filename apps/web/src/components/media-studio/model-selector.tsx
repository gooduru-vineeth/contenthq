"use client";

import type { FC } from "react";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelSelectorProps {
  mediaType: "image" | "video";
  selectedModels: string[];
  onModelsChange: (models: string[]) => void;
  multiSelect: boolean;
}

export const ModelSelector: FC<ModelSelectorProps> = ({
  mediaType,
  selectedModels,
  onModelsChange,
  multiSelect,
}) => {
  const { data: models, isLoading } = trpc.mediaGeneration.getModels.useQuery({
    type: mediaType,
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!models || models.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No models available for {mediaType}
      </div>
    );
  }

  if (multiSelect) {
    return (
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {models.map((model) => (
          <div
            key={model.id}
            className="flex items-start space-x-3 rounded-md border p-3"
          >
            <Checkbox
              id={model.id}
              checked={selectedModels.includes(model.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onModelsChange([...selectedModels, model.id]);
                } else {
                  onModelsChange(
                    selectedModels.filter((id) => id !== model.id)
                  );
                }
              }}
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor={model.id}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {model.name}
              </Label>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {model.provider}
                </Badge>
                {model.available ? (
                  <Badge variant="default" className="text-xs bg-green-500">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Unavailable
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Select
      value={selectedModels[0] || ""}
      onValueChange={(value) => onModelsChange([value])}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex items-center gap-2">
              <span>{model.name}</span>
              <Badge variant="outline" className="text-xs">
                {model.provider}
              </Badge>
              {!model.available && (
                <Badge variant="destructive" className="text-xs">
                  Unavailable
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
