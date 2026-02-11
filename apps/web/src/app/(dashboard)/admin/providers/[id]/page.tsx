"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderForm } from "@/components/admin/provider-form";

export default function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: provider, isPending } = trpc.adminProvider.getById.useQuery({
    id,
  });

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!provider) {
    return <p className="text-muted-foreground">Provider not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/providers">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Providers
        </Link>
      </Button>
      <ProviderForm provider={provider} />
    </div>
  );
}
