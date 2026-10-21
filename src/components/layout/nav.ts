import {
  LayoutDashboard,
  Layers,
  Library,
  Zap,
  GraduationCap,
  GalleryVerticalEnd,
  Target,
  Telescope,
  CalendarDays,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  short: string;
  href: string;
  icon: LucideIcon;
  group: "studio" | "strumenti" | "account";
}

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", short: "Home", href: "/", icon: LayoutDashboard, group: "studio" },
  { id: "materie", label: "Le mie materie", short: "Materie", href: "/materie", icon: Layers, group: "studio" },
  { id: "biblioteca", label: "Biblioteca", short: "Biblioteca", href: "/biblioteca", icon: Library, group: "studio" },
  { id: "modalita", label: "Study Modes", short: "Modes", href: "/modalita", icon: Zap, group: "studio" },
  { id: "academy", label: "Study Academy", short: "Academy", href: "/academy", icon: GraduationCap, group: "studio" },
  { id: "flashcard", label: "Flashcard", short: "Flashcard", href: "/flashcard", icon: GalleryVerticalEnd, group: "strumenti" },
  { id: "quiz", label: "Quiz e simulazioni", short: "Quiz", href: "/quiz", icon: Target, group: "strumenti" },
  { id: "risorse", label: "Study Resources", short: "Risorse", href: "/risorse", icon: Telescope, group: "strumenti" },
  { id: "calendario", label: "Calendario", short: "Calendario", href: "/calendario", icon: CalendarDays, group: "strumenti" },
  { id: "professor", label: "AI Professor", short: "Professor", href: "/professor", icon: Sparkles, group: "strumenti" },
  { id: "profilo", label: "Profilo e impostazioni", short: "Profilo", href: "/profilo", icon: Settings, group: "account" },
];

export const NAV_GROUPS: { id: NavItem["group"]; label: string }[] = [
  { id: "studio", label: "Studio" },
  { id: "strumenti", label: "Strumenti" },
  { id: "account", label: "Account" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
