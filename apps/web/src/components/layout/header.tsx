"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

import { navigation } from "@/lib/navigation";
import { NavLink } from "./nav-link";
import { AdminNav } from "./admin-nav";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const currentPage = navigation.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6 header-accent">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 sidebar-gradient text-sidebar-foreground">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle className="text-left text-xl font-bold tracking-tight text-sidebar-foreground">
              Content<span className="text-dash-blue">HQ</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="space-y-1 px-3 py-4">
            {navigation.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
            {session?.user?.role === "admin" && <AdminNav />}
          </nav>
          <div className="border-t border-sidebar-border" />
          <div className="flex items-center gap-3 p-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {userInitials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
              {userEmail && (
                <p className="truncate text-xs text-sidebar-foreground/50">
                  {userEmail}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        <h1 className="text-lg font-semibold">
          {currentPage?.label ?? "Dashboard"}
        </h1>
      </div>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {userInitials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{userName}</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
