"use client";

import { useMemo } from "react";
import {
  PERSONA_CATEGORIES,
  PERSONA_CATEGORY_LABELS,
} from "@contenthq/shared";
import type { PersonaCategory } from "@contenthq/shared";
import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PersonaPickerProps {
  selectedIds: Record<string, string>;
  onChange: (selections: Record<string, string>) => void;
}

export function PersonaPicker({ selectedIds, onChange }: PersonaPickerProps) {
  const { data: personas, isLoading } = trpc.prompt.listPersonas.useQuery();

  const grouped = useMemo(() => {
    if (!personas) return {} as Record<PersonaCategory, typeof personas>;
    const map: Partial<Record<PersonaCategory, typeof personas>> = {};
    for (const p of personas) {
      const cat = p.category as PersonaCategory;
      if (!map[cat]) map[cat] = [];
      map[cat]!.push(p);
    }
    return map;
  }, [personas]);

  const handleChange = (category: string, personaId: string) => {
    const next = { ...selectedIds };
    if (personaId === "__none__") {
      delete next[category];
    } else {
      next[category] = personaId;
    }
    onChange(next);
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading personas...</p>;
  }

  return (
    <div className="space-y-4">
      {PERSONA_CATEGORIES.map((category) => {
        const items = grouped[category] ?? [];
        return (
          <div key={category} className="space-y-1.5">
            <Label>{PERSONA_CATEGORY_LABELS[category]}</Label>
            <Select
              value={selectedIds[category] ?? "__none__"}
              onValueChange={(val) => handleChange(category, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a persona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {items.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
