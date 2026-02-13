"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Settings, Key, Palette, Sun, Moon, Monitor, Brain } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [defaultProvider, setDefaultProvider] = useState("openai");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your account and AI providers</p>
      </div>

      {/* AI Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" /> AI Provider API Keys
          </CardTitle>
          <CardDescription>Configure your AI provider credentials for video generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai">OpenAI API Key</Label>
            <Input
              id="openai"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anthropic">Anthropic API Key</Label>
            <Input
              id="anthropic"
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="elevenlabs">ElevenLabs API Key</Label>
            <Input
              id="elevenlabs"
              type="password"
              value={elevenLabsKey}
              onChange={(e) => setElevenLabsKey(e.target.value)}
              placeholder="..."
            />
          </div>
          <Button disabled>Save API Keys</Button>
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" /> Default Settings
          </CardTitle>
          <CardDescription>Set default values for new projects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default AI Provider</Label>
            <Select value={defaultProvider} onValueChange={setDefaultProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled>Save Settings</Button>
        </CardContent>
      </Card>

      {/* Model Preferences */}
      <ModelPreferences />

      {/* Appearance */}
      <ThemeSelector />
    </div>
  );
}

const MODEL_PURPOSE_TYPES = [
  { value: "llm", label: "Language Model" },
  { value: "image", label: "Image Generation" },
  { value: "vision", label: "Vision / Verification" },
  { value: "video", label: "Video Generation" },
  { value: "tts", label: "Text-to-Speech" },
] as const;

function ModelPreferences() {
  const utils = trpc.useUtils();
  const { data: preferences, isPending: prefsLoading } =
    trpc.userModelPreference.list.useQuery();

  const { data: llmModels } = trpc.userModelPreference.getModelsByType.useQuery({ type: "llm" });
  const { data: imageModels } = trpc.userModelPreference.getModelsByType.useQuery({ type: "image" });
  const { data: visionModels } = trpc.userModelPreference.getModelsByType.useQuery({ type: "vision" });
  const { data: videoModels } = trpc.userModelPreference.getModelsByType.useQuery({ type: "video" });
  const { data: ttsModels } = trpc.userModelPreference.getModelsByType.useQuery({ type: "tts" });

  const modelsByType: Record<string, Array<{ id: string; name: string; modelId: string; providerName: string | null }>> = {
    llm: (llmModels ?? []) as Array<{ id: string; name: string; modelId: string; providerName: string | null }>,
    image: (imageModels ?? []) as Array<{ id: string; name: string; modelId: string; providerName: string | null }>,
    vision: (visionModels ?? []) as Array<{ id: string; name: string; modelId: string; providerName: string | null }>,
    video: (videoModels ?? []) as Array<{ id: string; name: string; modelId: string; providerName: string | null }>,
    tts: (ttsModels ?? []) as Array<{ id: string; name: string; modelId: string; providerName: string | null }>,
  };

  const setMutation = trpc.userModelPreference.set.useMutation({
    onSuccess: () => {
      utils.userModelPreference.list.invalidate();
      toast.success("Model preference updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.userModelPreference.remove.useMutation({
    onSuccess: () => {
      utils.userModelPreference.list.invalidate();
      toast.success("Model preference cleared");
    },
    onError: (err) => toast.error(err.message),
  });

  const getPreferenceForType = (type: string) => {
    if (!preferences) return null;
    return (preferences as Array<{ purposeType: string; aiModelId: string }>).find(
      (p) => p.purposeType === type
    );
  };

  const handleChange = (purposeType: string, value: string) => {
    const typedPurposeType = purposeType as "llm" | "image" | "vision" | "video" | "tts";
    if (value === "default") {
      removeMutation.mutate({ purposeType: typedPurposeType });
    } else {
      setMutation.mutate({ purposeType: typedPurposeType, aiModelId: value });
    }
  };

  const isMutating = setMutation.isPending || removeMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4" /> Model Preferences
        </CardTitle>
        <CardDescription>
          Override platform default models for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {prefsLoading ? (
          <div className="space-y-3">
            {MODEL_PURPOSE_TYPES.map((pt) => (
              <Skeleton key={pt.value} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          MODEL_PURPOSE_TYPES.map((pt) => {
            const pref = getPreferenceForType(pt.value);
            const models = modelsByType[pt.value] ?? [];

            return (
              <div key={pt.value} className="flex items-center gap-4">
                <Label className="w-40 shrink-0 text-sm">{pt.label}</Label>
                <Select
                  value={pref?.aiModelId ?? "default"}
                  onValueChange={(value) => handleChange(pt.value, value)}
                  disabled={isMutating}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use platform default</SelectItem>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.providerName ? ` (${m.providerName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

const themeOptions = [
  { value: "light", label: "Light", icon: Sun, description: "Light background with dark text" },
  { value: "dark", label: "Dark", icon: Moon, description: "Dark background with light text" },
  { value: "system", label: "System", icon: Monitor, description: "Follows your OS preference" },
] as const;

const emptySubscribe = () => () => {};

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4" /> Appearance
        </CardTitle>
        <CardDescription>Choose how ContentHQ looks to you.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ value, label, icon: Icon, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                mounted && theme === value
                  ? "border-primary bg-accent"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground text-center">{description}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
