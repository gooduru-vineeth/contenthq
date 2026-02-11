"use client";

import { useState } from "react";
import { Plus, Sprout } from "lucide-react";
import { toast } from "sonner";
import {
  PROMPT_TYPES,
  PROMPT_TYPE_LABELS,
} from "@contenthq/shared";
import type { PromptType, CreatePromptTemplateInput } from "@contenthq/shared";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PromptTemplateCard } from "@/components/admin/prompt-template-card";
import { PromptTemplateForm } from "@/components/admin/prompt-template-form";

export default function AdminPromptsPage() {
  const [selectedType, setSelectedType] = useState<PromptType>("story_writing");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{
    id: string;
    type: PromptType;
    name: string;
    description: string | null;
    content: string;
    variables: string[] | null;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: templates, isLoading } =
    trpc.prompt.admin.listAllTemplates.useQuery({ type: selectedType });

  const seedDefaults = trpc.prompt.admin.seedDefaults.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Seeded ${data.templatesSeeded} templates and ${data.personasSeeded} personas`
      );
      utils.prompt.admin.listAllTemplates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const createTemplate = trpc.prompt.admin.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      setDialogOpen(false);
      utils.prompt.admin.listAllTemplates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateTemplate = trpc.prompt.admin.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated");
      setDialogOpen(false);
      setEditingTemplate(null);
      utils.prompt.admin.listAllTemplates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteTemplate = trpc.prompt.admin.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.prompt.admin.listAllTemplates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const setActiveTemplate = trpc.prompt.admin.setActiveTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template set as active");
      utils.prompt.admin.listAllTemplates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (data: CreatePromptTemplateInput) => {
    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate.id, ...data });
    } else {
      createTemplate.mutate(data);
    }
  };

  const handleEdit = (template: {
    id: string;
    type: PromptType;
    name: string;
    description: string | null;
    content: string;
    variables: string[] | null;
  }) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTemplate.mutate({ id });
  };

  const handleSetActive = (id: string) => {
    setActiveTemplate.mutate({ id });
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Prompt Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage system prompt templates for content generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => seedDefaults.mutate()}
            disabled={seedDefaults.isPending}
          >
            <Sprout className="h-4 w-4" />
            {seedDefaults.isPending ? "Seeding..." : "Seed Defaults"}
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      <Tabs
        value={selectedType}
        onValueChange={(v) => setSelectedType(v as PromptType)}
      >
        <TabsList>
          {PROMPT_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {PROMPT_TYPE_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROMPT_TYPES.map((type) => (
          <TabsContent key={type} value={type}>
            {isLoading && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && (!templates || templates.length === 0) && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                <h3 className="text-lg font-medium">
                  No templates for this type
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a template or seed defaults to get started.
                </p>
              </div>
            )}

            {!isLoading && templates && templates.length > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {templates.map((template) => (
                  <PromptTemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSetActive={handleSetActive}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTemplate(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the prompt template below."
                : "Fill in the details to create a new prompt template."}
            </DialogDescription>
          </DialogHeader>
          <PromptTemplateForm
            onSubmit={handleSubmit}
            defaultValues={
              editingTemplate
                ? {
                    type: editingTemplate.type,
                    name: editingTemplate.name,
                    content: editingTemplate.content,
                    description: editingTemplate.description ?? undefined,
                    variables: editingTemplate.variables ?? undefined,
                  }
                : { type: selectedType }
            }
            isLoading={createTemplate.isPending || updateTemplate.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
