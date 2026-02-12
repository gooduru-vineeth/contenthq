"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NodeConfigProps } from "./types";

export function DelayConfig({ data, onUpdate }: NodeConfigProps) {
  const delayConfig = data.delayConfig as
    | Record<string, unknown>
    | undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="delayType">Delay Type</Label>
        <Select
          value={(delayConfig?.type as string) || "timer"}
          onValueChange={(value: string) =>
            onUpdate("delayConfig", {
              ...delayConfig,
              type: value,
            })
          }
        >
          <SelectTrigger id="delayType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="timer">Timer</SelectItem>
            <SelectItem value="manual">Manual Approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {delayConfig?.type === "timer" && (
        <div className="space-y-2">
          <Label htmlFor="delaySeconds">Delay (seconds)</Label>
          <Input
            id="delaySeconds"
            type="number"
            value={(delayConfig?.seconds as number) || 0}
            onChange={(e) =>
              onUpdate("delayConfig", {
                ...delayConfig,
                type: "timer",
                seconds: parseInt(e.target.value) || 0,
              })
            }
            min={0}
          />
        </div>
      )}
    </div>
  );
}
