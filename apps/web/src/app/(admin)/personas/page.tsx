"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Sprout } from "lucide-react";
import { toast } from "sonner";
import {
  PERSONA_CATEGORIES,
  PERSONA_CATEGORY_LABELS,
  createPersonaSchema,
} from "@contenthq/shared";
import type {
  PersonaCategory,
  CreatePersonaInput,
} from "@contenthq/shared";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PersonaCard } from "@/components/admin/persona-card";
import { VersionHistorySheet } from "@/components/admin/version-history-sheet";

export default function AdminPersonasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<{
    id: string;
    category: PersonaCategory;
    name: string;
    label: string;
    description: string | null;
    promptFragment: string;
    version: number;
    isDefault: boolean;
  } | null>(null);
  const [historyPersonaId, setHistoryPersonaId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: personas, isLoading } =
    trpc.prompt.admin.listAllPersonas.useQuery();

  const { data: historyData } =
    trpc.prompt.admin.getPersonaVersionHistory.useQuery(
      { personaId: historyPersonaId! },
      { enabled: !!historyPersonaId }
    );

  const seedDefaults = trpc.prompt.admin.seedDefaults.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Seeded ${data.templatesSeeded} templates and ${data.personasSeeded} personas`
      );
      utils.prompt.admin.listAllPersonas.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const createPersona = trpc.prompt.admin.createPersona.useMutation({
    onSuccess: () => {
      toast.success("Persona created");
      setDialogOpen(false);
      utils.prompt.admin.listAllPersonas.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updatePersona = trpc.prompt.admin.updatePersona.useMutation({
    onSuccess: () => {
      toast.success("Persona updated");
      setDialogOpen(false);
      setEditingPersona(null);
      utils.prompt.admin.listAllPersonas.invalidate();
      utils.prompt.admin.getPersonaVersionHistory.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deletePersona = trpc.prompt.admin.deletePersona.useMutation({
    onSuccess: () => {
      toast.success("Persona deleted");
      utils.prompt.admin.listAllPersonas.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const setDefaultPersona = trpc.prompt.admin.setDefaultPersona.useMutation({
    onSuccess: () => {
      toast.success("Persona set as default");
      utils.prompt.admin.listAllPersonas.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const revertPersona = trpc.prompt.admin.revertPersona.useMutation({
    onSuccess: () => {
      toast.success("Persona reverted successfully");
      utils.prompt.admin.listAllPersonas.invalidate();
      utils.prompt.admin.getPersonaVersionHistory.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const grouped = useMemo(() => {
    if (!personas) return {};
    const groups: Partial<Record<PersonaCategory, typeof personas>> = {};
    for (const persona of personas) {
      const cat = persona.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(persona);
    }
    return groups;
  }, [personas]);

  const handleEdit = (persona: {
    id: string;
    category: PersonaCategory;
    name: string;
    label: string;
    description: string | null;
    promptFragment: string;
    version: number;
    isDefault: boolean;
  }) => {
    setEditingPersona(persona);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deletePersona.mutate({ id });
  };

  const handleSetDefault = (id: string) => {
    setDefaultPersona.mutate({ id });
  };

  const handleOpenCreate = () => {
    setEditingPersona(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personas</h1>
          <p className="text-sm text-muted-foreground">
            Manage persona configurations for content generation
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
            Create Persona
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!personas || personas.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <h3 className="text-lg font-medium">No personas yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a persona or seed defaults to get started.
          </p>
        </div>
      )}

      {!isLoading &&
        personas &&
        personas.length > 0 &&
        PERSONA_CATEGORIES.map((category) => {
          const categoryPersonas = grouped[category];
          if (!categoryPersonas || categoryPersonas.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className="text-lg font-semibold">
                {PERSONA_CATEGORY_LABELS[category]}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryPersonas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSetDefault={handleSetDefault}
                    onViewHistory={(id) => setHistoryPersonaId(id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPersona(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPersona ? "Edit Persona" : "Create Persona"}
            </DialogTitle>
            <DialogDescription>
              {editingPersona
                ? "Update the persona details below."
                : "Fill in the details to create a new persona."}
            </DialogDescription>
          </DialogHeader>
          <PersonaForm
            key={editingPersona?.id ?? "new"}
            onSubmit={(data) => {
              if (editingPersona) {
                updatePersona.mutate({ id: editingPersona.id, ...data });
              } else {
                createPersona.mutate(data);
              }
            }}
            defaultValues={
              editingPersona
                ? {
                    category: editingPersona.category,
                    name: editingPersona.name,
                    label: editingPersona.label,
                    promptFragment: editingPersona.promptFragment,
                    description: editingPersona.description ?? undefined,
                  }
                : undefined
            }
            isLoading={createPersona.isPending || updatePersona.isPending}
            isEditing={!!editingPersona}
          />
        </DialogContent>
      </Dialog>

      {historyData && (
        <VersionHistorySheet
          open={!!historyPersonaId}
          onOpenChange={(open) => {
            if (!open) setHistoryPersonaId(null);
          }}
          title={historyData.current.label}
          currentVersion={historyData.current.version}
          currentContent={historyData.current.promptFragment}
          currentName={historyData.current.label}
          history={historyData.history.map((h) => ({
            ...h,
            content: h.promptFragment,
            createdAt: h.createdAt,
          }))}
          onRevert={(targetVersion) => {
            if (historyPersonaId) {
              revertPersona.mutate({
                personaId: historyPersonaId,
                targetVersion,
              });
            }
          }}
          isReverting={revertPersona.isPending}
        />
      )}
    </div>
  );
}

function PersonaForm({
  onSubmit,
  defaultValues,
  isLoading,
  isEditing,
}: {
  onSubmit: (data: CreatePersonaInput & { changeNote?: string }) => void;
  defaultValues?: Partial<CreatePersonaInput>;
  isLoading?: boolean;
  isEditing?: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreatePersonaInput & { changeNote?: string }>({
    resolver: zodResolver(createPersonaSchema),
    defaultValues: {
      category: defaultValues?.category ?? "tone",
      name: defaultValues?.name ?? "",
      label: defaultValues?.label ?? "",
      promptFragment: defaultValues?.promptFragment ?? "",
      description: defaultValues?.description ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          defaultValue={defaultValues?.category ?? "tone"}
          onValueChange={(value) =>
            setValue("category", value as PersonaCategory)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {PERSONA_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {PERSONA_CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name (slug)</Label>
        <Input
          id="name"
          placeholder="e.g., professional"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          placeholder="e.g., Professional"
          {...register("label")}
        />
        {errors.label && (
          <p className="text-sm text-destructive">{errors.label.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Brief description of this persona"
          rows={2}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="promptFragment">Prompt Fragment</Label>
        <Textarea
          id="promptFragment"
          placeholder="The prompt fragment that will be injected when this persona is selected"
          rows={6}
          className="font-mono text-sm"
          {...register("promptFragment")}
        />
        {errors.promptFragment && (
          <p className="text-sm text-destructive">
            {errors.promptFragment.message}
          </p>
        )}
      </div>

      {isEditing && (
        <div className="space-y-2">
          <Label htmlFor="changeNote">Change Note (optional)</Label>
          <Input
            id="changeNote"
            placeholder="Describe what you changed"
            {...register("changeNote")}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? "Saving..."
          : defaultValues?.name
            ? "Update Persona"
            : "Create Persona"}
      </Button>
    </form>
  );
}
