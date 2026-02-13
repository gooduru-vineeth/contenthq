import {
  LayoutDashboard,
  FolderOpen,
  Image,
  Music,
  Mic,
  AudioLines,
  FileText,
  Users,
  CreditCard,
  Settings,
  Server,
  Cpu,
  Shield,
  Bot,
  GitBranch,
  Wand2,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Media", href: "/media", icon: Image },
  { label: "Music", href: "/music", icon: Music },
  { label: "Voices", href: "/voices", icon: Mic },
  { label: "Speech", href: "/speech-generations", icon: AudioLines },
  { label: "Prompts", href: "/prompts", icon: FileText },
  { label: "Personas", href: "/personas", icon: Users },
  { label: "Stock Media", href: "/stock-media", icon: Globe },
  { label: "Media Studio", href: "/media-studio", icon: Wand2 },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const adminNavigation: NavItem[] = [
  { label: "Prompts", href: "/admin/prompts", icon: Shield },
  { label: "Providers", href: "/admin/providers", icon: Server },
  { label: "Models", href: "/admin/models", icon: Cpu },
  { label: "Agents", href: "/admin/agents", icon: Bot },
  { label: "Flows", href: "/admin/flows", icon: GitBranch },
];
