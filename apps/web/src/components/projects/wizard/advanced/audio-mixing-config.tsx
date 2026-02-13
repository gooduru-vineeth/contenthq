"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { MediaUploadOverride } from "./media-upload-override";

export function AudioMixingConfig() {
  const form = useFormContext<CreateProjectInput>();
  const configKey = "stageConfigs.audioMixing" as any;

  const voiceoverVolume =
    form.watch(`${configKey}.voiceoverVolume` as any) ?? 80;
  const musicVolume = form.watch(`${configKey}.musicVolume` as any) ?? 30;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Voiceover Volume: {voiceoverVolume}%</Label>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[voiceoverVolume]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.voiceoverVolume` as any, v)
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Music Volume: {musicVolume}%</Label>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[musicVolume]}
          onValueChange={([v]) =>
            form.setValue(`${configKey}.musicVolume` as any, v)
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Music Ducking</Label>
        <Switch
          checked={
            form.watch(`${configKey}.musicDuckingEnabled` as any) ?? true
          }
          onCheckedChange={(checked) =>
            form.setValue(`${configKey}.musicDuckingEnabled` as any, checked)
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Fade In (ms)</Label>
          <Input
            type="number"
            min={0}
            max={5000}
            step={100}
            placeholder="500"
            value={form.watch(`${configKey}.fadeInMs` as any) ?? ""}
            onChange={(e) =>
              form.setValue(
                `${configKey}.fadeInMs` as any,
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fade Out (ms)</Label>
          <Input
            type="number"
            min={0}
            max={5000}
            step={100}
            placeholder="500"
            value={form.watch(`${configKey}.fadeOutMs` as any) ?? ""}
            onChange={(e) =>
              form.setValue(
                `${configKey}.fadeOutMs` as any,
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Custom Background Music</Label>
        <MediaUploadOverride
          label="Drop audio file to use custom background music"
          accept="audio/*"
          currentUrl={form.watch(`${configKey}.customMusicUrl` as any)}
          onUpload={(_file) => {
            // Upload handled by parent - set URL after upload
          }}
          onRemove={() =>
            form.setValue(`${configKey}.customMusicUrl` as any, undefined)
          }
        />
      </div>
    </div>
  );
}
