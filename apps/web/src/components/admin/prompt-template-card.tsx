"use client";

import { Pencil, Trash2, Check } from "lucide-react";
import type { PromptType } from "@contenthq/shared";
import { PROMPT_TYPE_LABELS } from "@contenthq/shared";

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

interface TemplateData {
  id: string;
  type: PromptType;
  name: string;
  description: string | null;
  content: string;
  version: number;
  isActive: boolean;
  variables: string[] | null;
}

interface PromptTemplateCardProps {
  template: TemplateData;
  onEdit: (template: TemplateData) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
}

export function PromptTemplateCard({
  template,
  onEdit,
  onDelete,
  onSetActive,
}: PromptTemplateCardProps) {
  const variables = template.variables ?? [];

  return (
    <Card
      className={cn(
        "flex flex-col",
        template.isActive && "border-green-500 border-2"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {PROMPT_TYPE_LABELS[template.type]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              v{template.version}
            </Badge>
            {template.isActive && (
              <Badge className="bg-green-600 text-xs hover:bg-green-600">
                Active
              </Badge>
            )}
          </div>
        </div>
        {template.description && (
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="rounded-md bg-muted p-3">
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">
            {template.content.length > 150
              ? `${template.content.slice(0, 150)}...`
              : template.content}
          </p>
        </div>

        {variables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {variables.map((v) => (
              <Badge key={v} variant="outline" className="text-xs font-mono">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(template)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(template.id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        {!template.isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-green-600 hover:text-green-600"
            onClick={() => onSetActive(template.id)}
          >
            <Check className="h-4 w-4" />
            Set Active
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
