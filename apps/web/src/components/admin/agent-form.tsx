"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AGENT_TYPES, AGENT_TYPE_LABELS, AGENT_STATUSES } from "@contenthq/shared";
import type { AgentType, AgentStatus } from "@contenthq/shared";

const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  agentType: z.enum([...AGENT_TYPES] as [AgentType, ...AgentType[]]),
  aiModelId: z.string().optional(),
  systemPrompt: z.string().optional(),
  promptTemplateId: z.string().optional(),
  modelConfig: z.object({
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().min(1).optional(),
  }),
  outputConfig: z.object({
    outputType: z.enum(["text", "object", "array"]),
    schemaName: z.string().optional(),
  }),
  expectedVariables: z.array(z.string()),
  isDefault: z.boolean(),
  status: z.enum([...AGENT_STATUSES] as [AgentStatus, ...AgentStatus[]]),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

interface AgentFormProps {
  defaultValues?: Partial<AgentFormValues>;
  onSubmit: (values: AgentFormValues) => void;
  isSubmitting?: boolean;
}

export function AgentForm({ defaultValues, onSubmit, isSubmitting }: AgentFormProps) {
  const [variableInput, setVariableInput] = useState("");

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      agentType: "llm_text",
      aiModelId: "",
      systemPrompt: "",
      promptTemplateId: "",
      modelConfig: {
        temperature: 0.7,
        maxTokens: 2000,
      },
      outputConfig: {
        outputType: "text",
        schemaName: "",
      },
      expectedVariables: [],
      isDefault: false,
      status: "draft",
      ...defaultValues,
    },
  });

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const watchedName = useWatch({ control: form.control, name: "name" });

  useEffect(() => {
    if (!defaultValues?.slug && watchedName) {
      form.setValue("slug", slugify(watchedName));
    }
  }, [watchedName, form, defaultValues?.slug]);

  const addVariable = () => {
    if (variableInput.trim()) {
      const currentVariables = form.getValues("expectedVariables");
      if (!currentVariables.includes(variableInput.trim())) {
        form.setValue("expectedVariables", [
          ...currentVariables,
          variableInput.trim(),
        ]);
      }
      setVariableInput("");
    }
  };

  const removeVariable = (variable: string) => {
    const currentVariables = form.getValues("expectedVariables");
    form.setValue(
      "expectedVariables",
      currentVariables.filter((v) => v !== variable)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Agent" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="my-agent" {...field} />
                </FormControl>
                <FormDescription>Auto-generated from name</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what this agent does..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="agentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {AGENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {AGENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {AGENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="aiModelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Model ID</FormLabel>
                <FormControl>
                  <Input placeholder="gpt-4-turbo" {...field} />
                </FormControl>
                <FormDescription>Optional model identifier</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="promptTemplateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prompt Template ID</FormLabel>
                <FormControl>
                  <Input placeholder="template-123" {...field} />
                </FormControl>
                <FormDescription>Optional template reference</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="You are a helpful assistant..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Model Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="modelConfig.temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={2}
                      step={0.1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>Controls randomness (0-2)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modelConfig.maxTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Tokens</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="2000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Output Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="outputConfig.outputType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select output type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="object">Object</SelectItem>
                      <SelectItem value="array">Array</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outputConfig.schemaName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schema Name</FormLabel>
                  <FormControl>
                    <Input placeholder="OutputSchema" {...field} />
                  </FormControl>
                  <FormDescription>Optional schema reference</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="expectedVariables"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expected Variables</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add variable name"
                    value={variableInput}
                    onChange={(e) => setVariableInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addVariable();
                      }
                    }}
                  />
                  <Button type="button" onClick={addVariable}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {field.value.map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeVariable(variable)}
                    >
                      {variable}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>
              <FormDescription>
                Variables that this agent expects in its input
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Default Agent</FormLabel>
                <FormDescription>
                  Set as the default agent for this type
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Agent"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
