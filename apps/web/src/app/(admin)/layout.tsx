"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bot, Box, CreditCard, FileText, GitBranch, LogOut, Server, Settings, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  iconColor: string;
}

const adminNavigation: AdminNavItem[] = [
  { label: "Prompts", href: "/admin/prompts", icon: FileText, iconColor: "text-dash-orange" },
  { label: "Personas", href: "/admin/personas", icon: Users, iconColor: "text-dash-purple" },
  { label: "Agents", href: "/admin/agents", icon: Bot, iconColor: "text-dash-teal" },
  { label: "Flows", href: "/admin/flows", icon: GitBranch, iconColor: "text-dash-deep-purple" },
  { label: "Models", href: "/admin/models", icon: Box, iconColor: "text-dash-blue" },
  { label: "Providers", href: "/admin/providers", icon: Server, iconColor: "text-dash-dark-teal" },
  { label: "Defaults", href: "/admin/default-models", icon: Settings, iconColor: "text-dash-charcoal" },
  { label: "Billing", href: "/admin/billing", icon: CreditCard, iconColor: "text-dash-blue" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (!isPending && session && userRole !== "admin") {
      router.replace("/");
    }
  }, [isPending, session, userRole, router]);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session || userRole !== "admin") {
    return null;
  }

  const userName = session.user.name ?? "Admin";
  const userEmail = session.user.email ?? "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64">
        <aside className="flex h-full w-64 flex-col border-r bg-sidebar-background text-sidebar-foreground">
          <div className="flex h-14 items-center px-6">
            <Link href="/admin/prompts" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">
                Content<span className="text-primary">HQ</span>{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  Admin
                </span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", !isActive && item.iconColor)} />
                  {item.label}
                </Link>
              );
            })}

            <Separator className="my-3" />

            <Link
              href="/"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <ArrowLeft className="h-4 w-4 text-dash-blue" />
              Back to App
            </Link>
          </nav>

          <Separator />

          <div className="flex items-center gap-3 p-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {userInitials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{userName}</p>
              {userEmail && (
                <p className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </aside>
      </div>

      <div className="flex flex-1 flex-col md:ml-64">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-end border-b bg-background px-4 md:px-6">
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
