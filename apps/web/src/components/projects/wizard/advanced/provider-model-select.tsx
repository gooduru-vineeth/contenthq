"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

interface ProviderModelSelectProps {
  stageType: "llm" | "image" | "video" | "tts";
  configKey: string;
}

export function ProviderModelSelect({
  stageType,
  configKey,
}: ProviderModelSelectProps) {
  const form = useFormContext<CreateProjectInput>();
  const providerKey = `${configKey}.provider` as any;
  const modelKey = `${configKey}.model` as any;

  const providersQuery = trpc.pipelineConfig.getProviderOptions.useQuery(
    { stageType },
    { retry: false, refetchOnWindowFocus: false }
  );

  const options = providersQuery.data ?? [];

  const providers = [...new Set(options.map((o: any) => o.provider))];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Provider</Label>
        <Select
          value={form.watch(providerKey) ?? ""}
          onValueChange={(v) => {
            form.setValue(providerKey, v);
            form.setValue(modelKey, undefined);
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Auto" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p: string) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Model</Label>
        <Select
          value={form.watch(modelKey) ?? ""}
          onValueChange={(v) => form.setValue(modelKey, v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            {options
              .filter(
                (o: any) =>
                  !form.watch(providerKey) ||
                  o.provider === form.watch(providerKey)
              )
              .map((o: any) => (
                <SelectItem key={o.model} value={o.model}>
                  {o.displayName ?? o.model}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
