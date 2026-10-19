"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, GalleryVerticalEnd, Menu, Play } from "lucide-react";
import { NAV, isActive } from "./nav";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/primitives";
import { useDueCards, useHydrated } from "@/lib/hooks";

export function MobileNav() {
  const pathname = usePathname();
  const openStartStudy = useUI((s) => s.openStartStudy);
  const moreOpen = useUI((s) => s.moreOpen);
  const setMoreOpen = useUI((s) => s.setMoreOpen);
  const hydrated = useHydrated();
  const due = useDueCards();

  const tab = (href: string, label: string, Icon: typeof LayoutDashboard, badge?: number) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn("relative flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium", active ? "text-fg" : "text-fg-subtle")}
      >
        <Icon className={cn("h-5 w-5", active && "text-azure-300")} strokeWidth={1.8} />
        {label}
        {!!badge && <span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-azure-500 px-1 text-center font-mono text-[9px] leading-4 text-white">{badge}</span>}
      </Link>
    );
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink-900/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Navigazione rapida"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch px-2">
          {tab("/", "Home", LayoutDashboard)}
          {tab("/materie", "Materie", Layers)}
          <div className="flex flex-1 items-center justify-center">
            <button
              onClick={() => openStartStudy()}
              className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-azure-500 text-white shadow-[0_0_0_1px_rgba(143,196,255,0.4)_inset,0_10px_30px_-6px_rgba(47,139,255,0.9)] active:scale-95"
              aria-label="Inizia a studiare"
            >
              <Play className="h-5 w-5 fill-current" />
            </button>
          </div>
          {tab("/flashcard", "Flashcard", GalleryVerticalEnd, hydrated ? due.length : 0)}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn("flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium", moreOpen ? "text-fg" : "text-fg-subtle")}
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" strokeWidth={1.8} />
            Altro
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} side="bottom" title="Tutte le sezioni">
        <ul className="grid grid-cols-3 gap-2 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border text-center text-[12px] leading-tight",
                    active ? "border-azure-400/40 bg-azure-500/10 text-fg" : "border-white/[0.07] bg-white/[0.03] text-fg-muted",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-azure-300" : "text-fg-subtle")} strokeWidth={1.8} />
                  <span className="px-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
