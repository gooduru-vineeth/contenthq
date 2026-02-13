"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VariationCard } from "./variation-card";

interface Variation {
  id: string;
  name: string;
  description: string;
}

export function VariationsStep() {
  const [variations, setVariations] = useState<Variation[]>([]);

  function addVariation() {
    if (variations.length >= 5) return;
    setVariations([
      ...variations,
      {
        id: crypto.randomUUID(),
        name: `Variation ${variations.length + 1}`,
        description: "",
      },
    ]);
  }

  function removeVariation(id: string) {
    setVariations(variations.filter((v) => v.id !== id));
  }

  function updateVariation(id: string, updates: Partial<Variation>) {
    setVariations(
      variations.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B Variations</CardTitle>
        <CardDescription>
          Create variations to test different configurations. Each variation
          overrides specific stage settings. (Optional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {variations.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No variations yet. Add one to test different configurations.
          </p>
        )}
        {variations.map((variation) => (
          <VariationCard
            key={variation.id}
            variation={variation}
            onUpdate={(updates) => updateVariation(variation.id, updates)}
            onRemove={() => removeVariation(variation.id)}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addVariation}
          disabled={variations.length >= 5}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Variation {variations.length >= 5 && "(Max 5)"}
        </Button>
      </CardContent>
    </Card>
  );
}
