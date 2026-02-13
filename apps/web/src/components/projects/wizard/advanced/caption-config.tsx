"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANIMATION_STYLES } from "@contenthq/video";
import type { AnimationStyleMeta } from "@contenthq/video";
import { Slider } from "@/components/ui/slider";

const POSITIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "center-left", label: "Center Left" },
  { value: "center", label: "Center" },
  { value: "center-right", label: "Center Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
];

const HIGHLIGHT_MODES = [
  { value: "none", label: "None" },
  { value: "highlight", label: "Highlight" },
  { value: "fill", label: "Fill" },
  { value: "karaoke", label: "Karaoke" },
];

export function CaptionConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.captionGeneration" as any;

  const fontSize = form.watch(`${configKey}.fontSize` as any) ?? 24;

  const stylesByCategory = ANIMATION_STYLES.reduce<Record<string, AnimationStyleMeta[]>>((acc, style) => {
    const cat = style.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(style);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    basic: "Basic Animations",
    styled: "Styled Captions",
    word: "Word Animations",
    effect: "Special Effects",
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Font</Label>
          <Input
            placeholder="Arial"
            value={form.watch(`${configKey}.font` as any) ?? ""}
            onChange={(e) =>
              form.setValue(`${configKey}.font` as any, e.target.value)
            }
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Font Size: {fontSize}px</Label>
          <Slider
            min={8}
            max={72}
            step={1}
            value={[fontSize]}
            onValueChange={([v]) =>
              form.setValue(`${configKey}.fontSize` as any, v)
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Font Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={form.watch(`${configKey}.fontColor` as any) ?? "#ffffff"}
              onChange={(e) =>
                form.setValue(`${configKey}.fontColor` as any, e.target.value)
              }
              className="h-8 w-12 cursor-pointer p-1"
            />
            <Input
              value={form.watch(`${configKey}.fontColor` as any) ?? "#ffffff"}
              onChange={(e) =>
                form.setValue(`${configKey}.fontColor` as any, e.target.value)
              }
              className="h-8 flex-1 text-xs"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Background Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={
                form.watch(`${configKey}.backgroundColor` as any) ?? "#000000"
              }
              onChange={(e) =>
                form.setValue(
                  `${configKey}.backgroundColor` as any,
                  e.target.value
                )
              }
              className="h-8 w-12 cursor-pointer p-1"
            />
            <Input
              value={
                form.watch(`${configKey}.backgroundColor` as any) ?? "#000000"
              }
              onChange={(e) =>
                form.setValue(
                  `${configKey}.backgroundColor` as any,
                  e.target.value
                )
              }
              className="h-8 flex-1 text-xs"
            />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Position</Label>
        <Select
          value={
            form.watch(`${configKey}.position` as any) ?? "bottom-center"
          }
          onValueChange={(v) =>
            form.setValue(`${configKey}.position` as any, v)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select position" />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Highlight Mode</Label>
          <Select
            value={form.watch(`${configKey}.highlightMode` as any) ?? "none"}
            onValueChange={(v) =>
              form.setValue(`${configKey}.highlightMode` as any, v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {HIGHLIGHT_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Highlight Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={
                form.watch(`${configKey}.highlightColor` as any) ?? "#ffff00"
              }
              onChange={(e) =>
                form.setValue(
                  `${configKey}.highlightColor` as any,
                  e.target.value
                )
              }
              className="h-8 w-12 cursor-pointer p-1"
            />
            <Input
              value={
                form.watch(`${configKey}.highlightColor` as any) ?? "#ffff00"
              }
              onChange={(e) =>
                form.setValue(
                  `${configKey}.highlightColor` as any,
                  e.target.value
                )
              }
              className="h-8 flex-1 text-xs"
            />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Words Per Line</Label>
        <Input
          type="number"
          min={1}
          max={10}
          placeholder="4"
          value={form.watch(`${configKey}.wordsPerLine` as any) ?? ""}
          onChange={(e) =>
            form.setValue(
              `${configKey}.wordsPerLine` as any,
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Animation Style</Label>
        <Select
          value={form.watch(`${configKey}.animationStyle` as any) ?? "none"}
          onValueChange={(v) =>
            form.setValue(`${configKey}.animationStyle` as any, v)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select animation style" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(stylesByCategory).map(([category, styles]) => (
              <SelectGroup key={category}>
                <SelectLabel className="text-xs font-semibold">
                  {categoryLabels[category] ?? category}
                </SelectLabel>
                {styles.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
