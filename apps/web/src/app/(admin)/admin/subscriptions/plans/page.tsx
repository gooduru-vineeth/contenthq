"use client";

import { useState, useEffect } from "react";
import { Plus, Star, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────────

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  credits: number;
  bonusCredits: number;
  priceInr: number;
  priceUsd: number;
  billingInterval: "monthly" | "yearly";
  popular: boolean;
  sortOrder: number;
  active: boolean;
  isDefault: boolean;
}

const EMPTY_FORM: PlanFormData = {
  name: "",
  slug: "",
  description: "",
  credits: 0,
  bonusCredits: 0,
  priceInr: 0,
  priceUsd: 0,
  billingInterval: "monthly",
  popular: false,
  sortOrder: 0,
  active: true,
  isDefault: false,
};

// ─── Plan Form Dialog ───────────────────────────────────────────────────

function PlanFormDialog({
  open,
  onOpenChange,
  mode,
  editId,
  initialData,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  editId?: string;
  initialData: PlanFormData;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<PlanFormData>(initialData);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  const createMutation = trpc.adminSubscription.createPlan.useMutation({
    onSuccess: () => {
      toast.success("Plan created successfully");
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.adminSubscription.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated successfully");
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    if (mode === "create") {
      createMutation.mutate({
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        credits: form.credits,
        bonusCredits: form.bonusCredits,
        priceInr: form.priceInr,
        priceUsd: form.priceUsd,
        billingInterval: form.billingInterval,
        popular: form.popular,
        sortOrder: form.sortOrder,
        active: form.active,
        isDefault: form.isDefault,
      });
    } else if (editId) {
      updateMutation.mutate({
        id: editId,
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        credits: form.credits,
        bonusCredits: form.bonusCredits,
        priceInr: form.priceInr,
        priceUsd: form.priceUsd,
        billingInterval: form.billingInterval,
        popular: form.popular,
        sortOrder: form.sortOrder,
        active: form.active,
        isDefault: form.isDefault,
      });
    }
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Subscription Plan" : "Edit Plan"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Set up a new subscription plan with credits and pricing."
              : "Update the plan details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name & Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Pro"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    ...(mode === "create" ? { slug: autoSlug(name) } : {}),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                placeholder="e.g. pro"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, hyphens only
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the plan"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
            />
          </div>

          {/* Credits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credits">Monthly Credits *</Label>
              <Input
                id="credits"
                type="number"
                min={0}
                value={form.credits}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    credits: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonusCredits">Bonus Credits</Label>
              <Input
                id="bonusCredits"
                type="number"
                min={0}
                value={form.bonusCredits}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    bonusCredits: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                One-time bonus on signup
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceInr">Price INR (paise)</Label>
              <Input
                id="priceInr"
                type="number"
                min={0}
                value={form.priceInr}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priceInr: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {form.priceInr > 0
                  ? `= ₹${(form.priceInr / 100).toFixed(2)}`
                  : "Free"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceUsd">Price USD (cents)</Label>
              <Input
                id="priceUsd"
                type="number"
                min={0}
                value={form.priceUsd}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priceUsd: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {form.priceUsd > 0
                  ? `= $${(form.priceUsd / 100).toFixed(2)}`
                  : "Free"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Billing Interval</Label>
              <Select
                value={form.billingInterval}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    billingInterval: v as "monthly" | "yearly",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sort Order */}
          <div className="w-32 space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sortOrder: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="popular"
                checked={form.popular}
                onCheckedChange={(v) => setForm((f) => ({ ...f, popular: v }))}
              />
              <Label htmlFor="popular">Popular</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isDefault"
                checked={form.isDefault}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isDefault: v }))
                }
              />
              <Label htmlFor="isDefault">Default Plan</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create Plan"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function SubscriptionPlansPage() {
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<string>();
  const [formData, setFormData] = useState<PlanFormData>(EMPTY_FORM);

  const utils = trpc.useUtils();

  const { data: plans, isLoading } =
    trpc.adminSubscription.listPlans.useQuery({
      includeInactive: showInactive,
    });

  const toggleMutation = trpc.adminSubscription.togglePlanActive.useMutation({
    onSuccess: (plan) => {
      toast.success(
        `Plan ${plan.active ? "activated" : "deactivated"} successfully`
      );
      utils.adminSubscription.listPlans.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function openCreate() {
    setDialogMode("create");
    setEditId(undefined);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(plan: NonNullable<typeof plans>[number]) {
    setDialogMode("edit");
    setEditId(plan.id);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      credits: plan.credits,
      bonusCredits: plan.bonusCredits ?? 0,
      priceInr: plan.priceInr,
      priceUsd: plan.priceUsd,
      billingInterval: plan.billingInterval,
      popular: plan.popular ?? false,
      sortOrder: plan.sortOrder,
      active: plan.active,
      isDefault: plan.isDefault ?? false,
    });
    setDialogOpen(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground mt-1">
            Manage subscription plans and pricing tiers
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant={showInactive ? "default" : "outline"}
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Hide" : "Show"} Inactive Plans
        </Button>
      </div>

      <div className="grid gap-4">
        {plans?.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {plan.popular && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                    {plan.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(plan)}
                    title="Edit plan"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: plan.id,
                        active: !plan.active,
                      })
                    }
                    title={plan.active ? "Deactivate" : "Activate"}
                  >
                    <Power
                      className={`h-4 w-4 ${plan.active ? "text-green-500" : "text-muted-foreground"}`}
                    />
                  </Button>
                  <Badge variant={plan.active ? "default" : "secondary"}>
                    {plan.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Credits</p>
                  <p className="font-medium">
                    {plan.credits.toLocaleString()}
                    {(plan.bonusCredits ?? 0) > 0 && (
                      <span className="text-green-600">
                        {" "}
                        +{(plan.bonusCredits ?? 0).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">
                    ₹{(plan.priceInr / 100).toFixed(2)} / $
                    {(plan.priceUsd / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Interval</p>
                  <p className="font-medium capitalize">
                    {plan.billingInterval}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sort Order</p>
                  <p className="font-medium">{plan.sortOrder}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No plans found. Create your first subscription plan to get started.
          </CardContent>
        </Card>
      )}

      <PlanFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        editId={editId}
        initialData={formData}
        onSuccess={() => utils.adminSubscription.listPlans.invalidate()}
      />
    </div>
  );
}
