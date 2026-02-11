"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Persona } from "@contenthq/shared";
import { PERSONA_CATEGORY_LABELS } from "@contenthq/shared";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PersonaCardProps {
  persona: Persona;
  isSystem: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PersonaCard({
  persona,
  isSystem,
  onEdit,
  onDelete,
}: PersonaCardProps) {
  const truncatedFragment =
    persona.promptFragment.length > 100
      ? persona.promptFragment.slice(0, 100) + "..."
      : persona.promptFragment;

  return (
    <Card className={cn("flex flex-col", isSystem && "border-muted")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{persona.label}</CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {PERSONA_CATEGORY_LABELS[persona.category]}
            </Badge>
            {isSystem && (
              <Badge variant="secondary" className="text-xs">
                System
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{persona.name}</p>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        {persona.description && (
          <p className="mb-2 text-sm text-muted-foreground">
            {persona.description}
          </p>
        )}
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {truncatedFragment}
        </p>
      </CardContent>
      {!isSystem && (
        <CardFooter className="gap-2 pt-0">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
