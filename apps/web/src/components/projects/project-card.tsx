"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  progressPercent: number;
  thumbnailUrl: string | null;
}

const statusBadgeVariant: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  draft: "secondary",
  completed: "default",
  failed: "destructive",
};

const statusBadgeClass: Record<string, string> = {
  draft: "",
  completed: "bg-green-500 hover:bg-green-500/80",
  failed: "",
};

function formatDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString();
}

export function ProjectCard({
  id,
  title,
  status,
  createdAt,
  progressPercent,
  thumbnailUrl,
}: ProjectCardProps) {
  const variant = statusBadgeVariant[status] ?? "outline";
  const badgeClass = statusBadgeClass[status] ?? "";

  return (
    <Link href={`/projects/${id}`}>
      <Card className="group cursor-pointer transition-shadow hover:shadow-md">
        {/* Thumbnail */}
        <div className="relative h-36 w-full overflow-hidden rounded-t-lg">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
          )}
          <Badge
            variant={variant}
            className={cn("absolute right-2 top-2 capitalize", badgeClass)}
          >
            {status.replace(/_/g, " ")}
          </Badge>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-1 text-base group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status === "failed" ? "bg-destructive" : "bg-primary",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
