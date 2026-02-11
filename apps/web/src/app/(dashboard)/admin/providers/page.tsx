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

type Provider = {
  id: string;
  name: string;
  slug: string;
  type: string;
  isEnabled: boolean | null;
  rateLimitPerMinute: number | null;
  costPerUnit: string | null;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export default function ProvidersPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: providers, isPending } = trpc.adminProvider.list.useQuery();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggleMutation = trpc.adminProvider.toggleEnabled.useMutation({
    onSuccess: () => utils.adminProvider.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.adminProvider.delete.useMutation({
    onSuccess: () => {
      utils.adminProvider.list.invalidate();
      toast.success("Provider deleted");
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const columns: ColumnDef<Provider, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: "slug",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Slug" />
      ),
      cell: ({ row }) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {row.getValue("slug")}
        </code>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {(row.getValue("type") as string).toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "isEnabled",
      header: "Enabled",
      cell: ({ row }) => (
        <Switch
          checked={row.original.isEnabled ?? false}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ id: row.original.id, isEnabled: checked })
          }
        />
      ),
    },
    {
      accessorKey: "rateLimitPerMinute",
      header: "Rate Limit",
      cell: ({ row }) => row.original.rateLimitPerMinute ?? "—",
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
              onClick={() =>
                router.push(`/admin/providers/${row.original.id}`)
              }
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
          <h2 className="text-2xl font-bold tracking-tight">AI Providers</h2>
          <p className="text-muted-foreground">
            Manage AI provider configurations
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/providers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
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
          data={(providers as Provider[]) ?? []}
          searchKey="name"
          searchPlaceholder="Search providers..."
        />
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Provider</DialogTitle>
            <DialogDescription>
              This will permanently delete this provider and all its associated
              models. This action cannot be undone.
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
