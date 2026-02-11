"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ModelForm } from "@/components/admin/model-form";

export default function NewModelPage() {
  const searchParams = useSearchParams();
  const providerId = searchParams.get("providerId") ?? undefined;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/models">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Models
        </Link>
      </Button>
      <ModelForm defaultProviderId={providerId} />
    </div>
  );
}
