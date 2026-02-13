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

const TRANSITIONS = [
  { value: "fade", label: "Fade" },
  { value: "cut", label: "Cut" },
  { value: "dissolve", label: "Dissolve" },
  { value: "wipe", label: "Wipe" },
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

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Transitions</Label>
        <Select
          value={form.watch(`${configKey}.transitions` as any) ?? "fade"}
          onValueChange={(v) =>
            form.setValue(`${configKey}.transitions` as any, v)
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
