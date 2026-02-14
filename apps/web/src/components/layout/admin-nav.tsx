"use client";

import { adminNavigation } from "@/lib/navigation";
import { NavLink } from "./nav-link";

export function AdminNav() {
  return (
    <div className="mt-4 border-t border-sidebar-border pt-4">
      <p className="mb-2 px-3 text-xs font-semibold uppercase text-sidebar-foreground/50">
        Admin
      </p>
      {adminNavigation.map((item) => (
        <NavLink key={item.href} item={item} />
      ))}
    </div>
  );
}
