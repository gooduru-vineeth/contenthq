"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectWizard } from "@/components/projects/project-wizard";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create New Project
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up a new video content project
          </p>
        </div>
      </div>

      <ProjectWizard />
    </div>
  );
}
