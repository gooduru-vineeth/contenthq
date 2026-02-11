"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import {
  PERSONA_CATEGORIES,
  PERSONA_CATEGORY_LABELS,
} from "@contenthq/shared";
import type { PersonaCategory, Persona } from "@contenthq/shared";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PersonaCard } from "@/components/personas/persona-card";

export default function PersonasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const [formCategory, setFormCategory] = useState<PersonaCategory>("tone");
  const [formName, setFormName] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFragment, setFormFragment] = useState("");

  const utils = trpc.useUtils();
  const { data: personas, isLoading } = trpc.prompt.listPersonas.useQuery();

  const createMutation = trpc.prompt.createPersona.useMutation({
    onSuccess: () => {
      toast.success("Persona created successfully");
      utils.prompt.listPersonas.invalidate();
      resetForm();
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = trpc.prompt.updatePersona.useMutation({
    onSuccess: () => {
      toast.success("Persona updated");
      utils.prompt.listPersonas.invalidate();
      resetForm();
      setEditingPersona(null);
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.prompt.deletePersona.useMutation({
    onSuccess: () => {
      toast.success("Persona deleted");
      utils.prompt.listPersonas.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function resetForm() {
    setFormCategory("tone");
    setFormName("");
    setFormLabel("");
    setFormDescription("");
    setFormFragment("");
  }

  function openEditDialog(persona: Persona) {
    setEditingPersona(persona);
    setFormCategory(persona.category);
    setFormName(persona.name);
    setFormLabel(persona.label);
    setFormDescription(persona.description ?? "");
    setFormFragment(persona.promptFragment);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formName.trim() || !formLabel.trim() || !formFragment.trim()) {
      toast.error("Name, label, and prompt fragment are required");
      return;
    }

    if (editingPersona) {
      updateMutation.mutate({
        id: editingPersona.id,
        name: formName.trim(),
        label: formLabel.trim(),
        promptFragment: formFragment.trim(),
        description: formDescription.trim() || undefined,
      });
    } else {
      createMutation.mutate({
        category: formCategory,
        name: formName.trim(),
        label: formLabel.trim(),
        promptFragment: formFragment.trim(),
        description: formDescription.trim() || undefined,
      });
    }
  }

  const grouped = PERSONA_CATEGORIES.map((cat) => ({
    category: cat,
    label: PERSONA_CATEGORY_LABELS[cat],
    items: (personas ?? []).filter((p) => p.category === cat),
  }));

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Personas</h1>
          <p className="text-sm text-muted-foreground">
            Manage persona configurations that shape your content's voice
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPersona(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Create Custom Persona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPersona ? "Edit Persona" : "Create Custom Persona"}
              </DialogTitle>
              <DialogDescription>
                {editingPersona
                  ? "Update your persona settings."
                  : "Create a new persona to shape your content's voice."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="persona-category">Category</Label>
                <Select
                  value={formCategory}
                  onValueChange={(val) =>
                    setFormCategory(val as PersonaCategory)
                  }
                  disabled={!!editingPersona}
                >
                  <SelectTrigger id="persona-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONA_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {PERSONA_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="persona-label">Label</Label>
                  <Input
                    id="persona-label"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="Friendly Narrator"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="persona-name">Name (slug)</Label>
                  <Input
                    id="persona-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="friendly-narrator"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="persona-desc">Description (optional)</Label>
                <Textarea
                  id="persona-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this persona does..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="persona-fragment">Prompt Fragment</Label>
                <Textarea
                  id="persona-fragment"
                  value={formFragment}
                  onChange={(e) => setFormFragment(e.target.value)}
                  placeholder="The instruction text that will be injected into prompts..."
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setEditingPersona(null);
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting
                  ? editingPersona
                    ? "Updating..."
                    : "Creating..."
                  : editingPersona
                    ? "Update Persona"
                    : "Create Persona"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && personas?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No personas yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a custom persona to shape your content's voice.
          </p>
        </div>
      )}

      {!isLoading &&
        personas &&
        personas.length > 0 &&
        grouped.map(
          (group) =>
            group.items.length > 0 && (
              <div key={group.category} className="space-y-3">
                <h2 className="text-lg font-semibold">{group.label}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((persona) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      isSystem={persona.createdBy === null}
                      onEdit={() => openEditDialog(persona)}
                      onDelete={() =>
                        deleteMutation.mutate({ id: persona.id })
                      }
                    />
                  ))}
                </div>
              </div>
            )
        )}
    </div>
  );
}
