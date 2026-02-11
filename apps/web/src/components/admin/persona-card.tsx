"use client";

import { Pencil, Trash2, Check } from "lucide-react";
import type { PersonaCategory } from "@contenthq/shared";
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

interface PersonaData {
  id: string;
  category: PersonaCategory;
  name: string;
  label: string;
  description: string | null;
  promptFragment: string;
  isDefault: boolean;
}

interface PersonaCardProps {
  persona: PersonaData;
  onEdit: (persona: PersonaData) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function PersonaCard({
  persona,
  onEdit,
  onDelete,
  onSetDefault,
}: PersonaCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col",
        persona.isDefault && "border-green-500 border-2"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{persona.label}</CardTitle>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {persona.name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {PERSONA_CATEGORY_LABELS[persona.category]}
            </Badge>
            {persona.isDefault && (
              <Badge className="bg-green-600 text-xs hover:bg-green-600">
                Default
              </Badge>
            )}
          </div>
        </div>
        {persona.description && (
          <p className="text-sm text-muted-foreground">
            {persona.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="rounded-md bg-muted p-3">
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">
            {persona.promptFragment.length > 150
              ? `${persona.promptFragment.slice(0, 150)}...`
              : persona.promptFragment}
          </p>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(persona)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(persona.id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        {!persona.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-green-600 hover:text-green-600"
            onClick={() => onSetDefault(persona.id)}
          >
            <Check className="h-4 w-4" />
            Set Default
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
