"use client";

import Link from "next/link";
import { FolderOpen, CreditCard, Activity, Plus } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectCard } from "@/components/projects/project-card";

const INACTIVE_STATUSES = ["draft", "completed", "failed", "cancelled"];

export default function DashboardPage() {
  const { data: projects, isLoading: projectsLoading } =
    trpc.project.list.useQuery();
  const { data: availableBalance, isPending: balancePending } =
    trpc.billing.getAvailableBalance.useQuery();

  const totalProjects = projects?.length ?? 0;
  const availableCredits = availableBalance?.available ?? 0;
  const activeCount =
    projects?.filter((p) => !INACTIVE_STATUSES.includes(p.status)).length ?? 0;
  const recentProjects = projects?.slice(0, 5) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome to ContentHQ
          </h2>
          <p className="text-muted-foreground">
            Manage your content projects and media assets.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-dash-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-dash-blue" />
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-40" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-dash-blue">{totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {totalProjects === 0
                    ? "Create your first project to get started"
                    : `${totalProjects} project${totalProjects === 1 ? "" : "s"} total`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-dash-purple">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Credits Remaining
            </CardTitle>
            <CreditCard className="h-4 w-4 text-dash-purple" />
          </CardHeader>
          <CardContent>
            {balancePending ? (
              <>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-44" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-dash-purple">
                  {availableCredits.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available credits for AI generation
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-dash-orange">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-dash-orange" />
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-36" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-dash-orange">{activeCount}</div>
                <p className="text-xs text-muted-foreground">
                  {activeCount === 0
                    ? "No active projects"
                    : `${activeCount} project${activeCount === 1 ? "" : "s"} in progress`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Projects</h3>

        {/* Loading state */}
        {projectsLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-36 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!projectsLoading && recentProjects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-dash-purple/30 mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                No projects yet. Create your first project to get started.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Project grid */}
        {!projectsLoading && recentProjects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                title={project.title}
                status={project.status}
                createdAt={project.createdAt}
                progressPercent={project.progressPercent ?? 0}
                thumbnailUrl={project.thumbnailUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
