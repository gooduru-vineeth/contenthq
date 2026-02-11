"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type ModelRow = {
  id: string;
  providerId: string;
  name: string;
  modelId: string;
  type: string | null;
  isDefault: boolean | null;
  costs: unknown;
  capabilities: unknown;
  createdAt: Date;
  updatedAt: Date;
  providerName: string | null;
  providerSlug: string | null;
};

export default function ModelsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: models, isPending } = trpc.adminModel.list.useQuery();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggleMutation = trpc.adminModel.toggleDefault.useMutation({
    onSuccess: () => utils.adminModel.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.adminModel.delete.useMutation({
    onSuccess: () => {
      utils.adminModel.list.invalidate();
      toast.success("Model deleted");
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const columns: ColumnDef<ModelRow, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: "modelId",
      header: "Model ID",
      cell: ({ row }) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {row.getValue("modelId")}
        </code>
      ),
    },
    {
      accessorKey: "providerName",
      header: "Provider",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.providerName ?? "—"}</Badge>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) =>
        row.original.type ? (
          <Badge variant="secondary">{row.original.type}</Badge>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "isDefault",
      header: "Default",
      cell: ({ row }) => (
        <Switch
          checked={row.original.isDefault ?? false}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ id: row.original.id, isDefault: checked })
          }
        />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.push(`/admin/models/${row.original.id}`)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Models</h2>
          <p className="text-muted-foreground">
            Manage AI model configurations
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/models/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Model
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(models as ModelRow[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search models..."
        />
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>
              This will permanently delete this model. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
