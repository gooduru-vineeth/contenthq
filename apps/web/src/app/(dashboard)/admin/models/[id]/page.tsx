"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelForm } from "@/components/admin/model-form";

export default function EditModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: model, isPending } = trpc.adminModel.getById.useQuery({ id });

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!model) {
    return <p className="text-muted-foreground">Model not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/models">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Models
        </Link>
      </Button>
      <ModelForm model={model} />
    </div>
  );
}
