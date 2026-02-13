"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const TRANSITIONS = [
  { value: "fade", label: "Fade" },
  { value: "fadeblack", label: "Fade to Black" },
  { value: "fadewhite", label: "Fade to White" },
  { value: "dissolve", label: "Dissolve" },
  { value: "wipeleft", label: "Wipe Left" },
  { value: "wiperight", label: "Wipe Right" },
  { value: "slideleft", label: "Slide Left" },
  { value: "slideright", label: "Slide Right" },
  { value: "circleopen", label: "Circle Open" },
  { value: "circleclose", label: "Circle Close" },
  { value: "smoothleft", label: "Smooth Left" },
  { value: "smoothright", label: "Smooth Right" },
  { value: "zoomin", label: "Zoom In" },
  { value: "none", label: "Hard Cut" },
];

const TRANSITION_ASSIGNMENTS = [
  { value: "uniform", label: "Same for All" },
  { value: "system_random", label: "System Random" },
  { value: "ai_random", label: "AI Contextual" },
  { value: "manual", label: "Manual" },
];

const RESOLUTIONS = [
  { value: "720p", label: "720p (HD)" },
  { value: "1080p", label: "1080p (Full HD)" },
  { value: "4k", label: "4K (Ultra HD)" },
];

const FPS_OPTIONS = [
  { value: "24", label: "24 fps" },
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
];

export function AssemblyConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.assembly" as any;

  const watermarkEnabled =
    form.watch(`${configKey}.watermarkEnabled` as any) ?? false;
  const transitionAssignment = form.watch(`${configKey}.transitionAssignment` as any) ?? "uniform";
  const transitionDuration = form.watch(`${configKey}.transitionDuration` as any) ?? 0.5;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Transition Assignment</Label>
        <Select
          value={transitionAssignment}
          onValueChange={(v) =>
            form.setValue(`${configKey}.transitionAssignment` as any, v)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select assignment" />
          </SelectTrigger>
          <SelectContent>
            {TRANSITION_ASSIGNMENTS.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(transitionAssignment === "uniform" || transitionAssignment === "manual") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Transition Type</Label>
          <Select
            value={form.watch(`${configKey}.transitionType` as any) ?? "fade"}
            onValueChange={(v) =>
              form.setValue(`${configKey}.transitionType` as any, v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select transition" />
            </SelectTrigger>
            <SelectContent>
              {TRANSITIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">
          Transition Duration: {transitionDuration}s
        </Label>
        <Slider
          min={0.1}
          max={2.0}
          step={0.1}
          value={[transitionDuration]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.transitionDuration` as any, v)
          }
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0.1s</span>
          <span>2.0s</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Resolution</Label>
          <Select
            value={form.watch(`${configKey}.resolution` as any) ?? "1080p"}
            onValueChange={(v) =>
              form.setValue(`${configKey}.resolution` as any, v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Frame Rate</Label>
          <Select
            value={form.watch(`${configKey}.fps` as any) ?? "30"}
            onValueChange={(v) =>
              form.setValue(`${configKey}.fps` as any, v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select FPS" />
            </SelectTrigger>
            <SelectContent>
              {FPS_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Watermark</Label>
        <Switch
          checked={watermarkEnabled}
          onCheckedChange={(checked) =>
            form.setValue(`${configKey}.watermarkEnabled` as any, checked)
          }
        />
      </div>
      {watermarkEnabled && (
        <div className="space-y-1.5">
          <Label className="text-xs">Watermark Text</Label>
          <Input
            placeholder="Your brand name"
            value={form.watch(`${configKey}.watermarkText` as any) ?? ""}
            onChange={(e) =>
              form.setValue(`${configKey}.watermarkText` as any, e.target.value)
            }
            className="h-8 text-xs"
          />
        </div>
      )}
    </div>
  );
}
