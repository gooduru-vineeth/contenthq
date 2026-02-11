import {
  LayoutDashboard,
  FolderOpen,
  Image,
  Music,
  Mic,
  CreditCard,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navigation: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Media", href: "/media", icon: Image },
  { label: "Music", href: "/music", icon: Music },
  { label: "Voices", href: "/voices", icon: Mic },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];
