"use client";

import { useState } from "react";
import { Plus, Star, Trash2, History } from "lucide-react";
import {
  PROMPT_TYPES,
  PROMPT_TYPE_LABELS,
} from "@contenthq/shared";
import type { PromptType } from "@contenthq/shared";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PromptEditor } from "@/components/prompts/prompt-editor";
import { VersionHistorySheet } from "@/components/admin/version-history-sheet";

export default function PromptsPage() {
  const [selectedType, setSelectedType] = useState<PromptType>(PROMPT_TYPES[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyTemplateId, setHistoryTemplateId] = useState<string | null>(
    null
  );

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<PromptType>(PROMPT_TYPES[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");

  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.prompt.listTemplates.useQuery({
    type: selectedType,
  });

  const { data: historyData } =
    trpc.prompt.getTemplateVersionHistory.useQuery(
      { templateId: historyTemplateId! },
      { enabled: !!historyTemplateId }
    );

  const createMutation = trpc.prompt.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Prompt created successfully");
      utils.prompt.listTemplates.invalidate();
      resetForm();
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.prompt.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Prompt deleted");
      utils.prompt.listTemplates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const setActiveMutation = trpc.prompt.setActiveTemplate.useMutation({
    onSuccess: () => {
      toast.success("Active prompt updated");
      utils.prompt.listTemplates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const revertMutation = trpc.prompt.revertTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template reverted successfully");
      utils.prompt.listTemplates.invalidate();
      utils.prompt.getTemplateVersionHistory.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function resetForm() {
    setFormName("");
    setFormType(PROMPT_TYPES[0]);
    setFormDescription("");
    setFormContent("");
  }

  function handleCreate() {
    if (!formName.trim() || !formContent.trim()) {
      toast.error("Name and content are required");
      return;
    }
    createMutation.mutate({
      type: formType,
      name: formName.trim(),
      content: formContent.trim(),
      description: formDescription.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Prompts</h1>
          <p className="text-sm text-muted-foreground">
            Manage prompt templates for your content pipeline
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Create Custom Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Prompt</DialogTitle>
              <DialogDescription>
                Create a new prompt template to use in your projects.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prompt-name">Name</Label>
                  <Input
                    id="prompt-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="My custom prompt"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prompt-type">Type</Label>
                  <Select
                    value={formType}
                    onValueChange={(val) => setFormType(val as PromptType)}
                  >
                    <SelectTrigger id="prompt-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMPT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {PROMPT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prompt-desc">Description (optional)</Label>
                <Textarea
                  id="prompt-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this prompt does..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <PromptEditor value={formContent} onChange={setFormContent} />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Prompt"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        value={selectedType}
        onValueChange={(val) => setSelectedType(val as PromptType)}
      >
        <TabsList>
          {PROMPT_TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>
              {PROMPT_TYPE_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROMPT_TYPES.map((t) => (
          <TabsContent key={t} value={t}>
            {isLoading && selectedType === t && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-40 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && selectedType === t && templates?.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                <h3 className="text-lg font-medium">No prompts found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a custom prompt or wait for system prompts to appear.
                </p>
              </div>
            )}

            {!isLoading &&
              selectedType === t &&
              templates &&
              templates.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((tmpl) => {
                    const isSystem = tmpl.createdBy === null;
                    const isOwned = !isSystem;
                    const truncatedContent =
                      tmpl.content.length > 120
                        ? tmpl.content.slice(0, 120) + "..."
                        : tmpl.content;

                    return (
                      <Card
                        key={tmpl.id}
                        className={cn(
                          "flex flex-col",
                          tmpl.isActive && "border-green-500 ring-1 ring-green-500/20"
                        )}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">
                              {tmpl.name}
                            </CardTitle>
                            <div className="flex shrink-0 items-center gap-1">
                              {tmpl.isActive && (
                                <Badge className="bg-green-600 text-xs hover:bg-green-700">
                                  Active
                                </Badge>
                              )}
                              {isSystem && (
                                <Badge variant="secondary" className="text-xs">
                                  System
                                </Badge>
                              )}
                            </div>
                          </div>
                          {tmpl.description && (
                            <CardDescription className="text-xs">
                              {tmpl.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="flex-1 pb-3">
                          <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                            {truncatedContent}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Version {tmpl.version}
                          </p>
                        </CardContent>
                        <CardFooter className="gap-2 pt-0">
                          {!tmpl.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setActiveMutation.mutate({ id: tmpl.id })
                              }
                              disabled={setActiveMutation.isPending}
                            >
                              <Star className="mr-1 h-3 w-3" />
                              Set Active
                            </Button>
                          )}
                          {isOwned && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setHistoryTemplateId(tmpl.id)
                                }
                              >
                                <History className="mr-1 h-3 w-3" />
                                History
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  deleteMutation.mutate({ id: tmpl.id })
                                }
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
          </TabsContent>
        ))}
      </Tabs>

      {historyData && (
        <VersionHistorySheet
          open={!!historyTemplateId}
          onOpenChange={(open) => {
            if (!open) setHistoryTemplateId(null);
          }}
          title={historyData.current.name}
          currentVersion={historyData.current.version}
          currentContent={historyData.current.content}
          currentName={historyData.current.name}
          history={historyData.history.map((h) => ({
            ...h,
            content: h.content,
            createdAt: h.createdAt,
          }))}
          onRevert={(targetVersion) => {
            if (historyTemplateId) {
              revertMutation.mutate({
                templateId: historyTemplateId,
                targetVersion,
              });
            }
          }}
          isReverting={revertMutation.isPending}
        />
      )}
    </div>
  );
}
