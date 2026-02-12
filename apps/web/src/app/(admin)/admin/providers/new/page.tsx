"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProviderForm } from "@/components/admin/provider-form";

export default function NewProviderPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/providers">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Providers
        </Link>
      </Button>
      <ProviderForm />
    </div>
  );
}
