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
  Crown,
  Settings,
  Server,
  Cpu,
  Shield,
  Bot,
  GitBranch,
  Wand2,
  Globe,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  iconColor?: string;
}

export const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, iconColor: "text-dash-blue" },
  { label: "Projects", href: "/projects", icon: FolderOpen, iconColor: "text-dash-purple" },
  { label: "Media", href: "/media", icon: Image, iconColor: "text-dash-orange" },
  { label: "Music", href: "/music", icon: Music, iconColor: "text-dash-deep-purple" },
  { label: "Voices", href: "/voices", icon: Mic, iconColor: "text-dash-teal" },
  { label: "Speech", href: "/speech-generations", icon: AudioLines, iconColor: "text-dash-dark-teal" },
  { label: "Prompts", href: "/prompts", icon: FileText, iconColor: "text-dash-blue" },
  { label: "Personas", href: "/personas", icon: Users, iconColor: "text-dash-purple" },
  { label: "Stock Media", href: "/stock-media", icon: Globe, iconColor: "text-dash-orange" },
  { label: "Media Studio", href: "/media-studio", icon: Wand2, iconColor: "text-dash-deep-purple" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, iconColor: "text-dash-teal" },
  { label: "Billing", href: "/billing", icon: CreditCard, iconColor: "text-dash-teal" },
  { label: "Settings", href: "/settings", icon: Settings, iconColor: "text-dash-dark-teal" },
];

export const adminNavigation: NavItem[] = [
  { label: "Prompts", href: "/admin/prompts", icon: Shield, iconColor: "text-dash-orange" },
  { label: "Providers", href: "/admin/providers", icon: Server, iconColor: "text-dash-blue" },
  { label: "Models", href: "/admin/models", icon: Cpu, iconColor: "text-dash-purple" },
  { label: "Agents", href: "/admin/agents", icon: Bot, iconColor: "text-dash-teal" },
  { label: "Flows", href: "/admin/flows", icon: GitBranch, iconColor: "text-dash-deep-purple" },
  { label: "Subscriptions", href: "/admin/subscriptions/plans", icon: Crown, iconColor: "text-dash-orange" },
];
