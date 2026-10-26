"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, GalleryVerticalEnd, Menu, Play, ChevronRight } from "lucide-react";
import { NAV, NAV_GROUPS, isActive } from "./nav";
import { useUI } from "@/lib/ui-store";
import { useAtlas } from "@/lib/store";
import { capFirst, cn, daysBetween, fmt } from "@/lib/utils";
import { Sheet } from "@/components/ui/primitives";
import { useDueCards, useHydrated } from "@/lib/hooks";
import { EXAM_DATES } from "@/data/exam";

/** Paths with their own bottom bar (the study session): the global tab bar steps aside. */
export const hidesMobileNav = (pathname: string) => pathname.startsWith("/studio/");

export function MobileNav() {
  const pathname = usePathname();
  const openStartStudy = useUI((s) => s.openStartStudy);
  const moreOpen = useUI((s) => s.moreOpen);
  const setMoreOpen = useUI((s) => s.setMoreOpen);
  const hydrated = useHydrated();
  const due = useDueCards();
  const profile = useAtlas((s) => s.profile);
  const exam = EXAM_DATES.find((e) => e.id === profile.examTarget) ?? EXAM_DATES[0];
  const days = Math.max(0, daysBetween(new Date(), exam.date));

  if (hidesMobileNav(pathname)) return null;

  const primary = ["/", "/materie", "/flashcard"];
  const moreActive = !primary.some((h) => isActive(pathname, h));

  const tab = (href: string, label: string, Icon: typeof LayoutDashboard, badge?: number) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        aria-label={badge ? `${label}, ${badge} da ripassare` : undefined}
        className={cn("relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-fg" : "text-fg-subtle")}
      >
        {active && <span className="absolute inset-x-[30%] top-0 h-[2px] rounded-full bg-azure-400 shadow-[0_0_8px_rgb(61_139_255/0.9)]" aria-hidden />}
        <span className="relative">
          <Icon className={cn("h-[22px] w-[22px]", active && "text-azure-300")} strokeWidth={1.75} aria-hidden />
          {!!badge && (
            <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-azure-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white tabular-nums" aria-hidden>
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink-900/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
        aria-label="Navigazione rapida"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
          {tab("/", "Home", LayoutDashboard)}
          {tab("/materie", "Materie", Layers)}
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => openStartStudy()}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azure-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(61_139_255/0.6),0_8px_24px_-8px_rgb(26_102_255/0.95)] transition-transform active:scale-95"
              aria-label="Inizia a studiare"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden />
            </button>
          </div>
          {tab("/flashcard", "Flashcard", GalleryVerticalEnd, hydrated ? due.length : 0)}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn("relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", moreOpen || moreActive ? "text-fg" : "text-fg-subtle")}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            {moreActive && <span className="absolute inset-x-[30%] top-0 h-[2px] rounded-full bg-azure-400 shadow-[0_0_8px_rgb(61_139_255/0.9)]" aria-hidden />}
            <Menu className={cn("h-[22px] w-[22px]", moreActive && "text-azure-300")} strokeWidth={1.75} aria-hidden />
            Altro
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} side="bottom" title="Tutte le sezioni">
        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
          <Link
            href="/calendario"
            onClick={() => setMoreOpen(false)}
            className="mb-4 flex items-center justify-between gap-3 rounded-card border border-white/[0.07] bg-white/[0.025] px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block text-xs text-fg-subtle">{exam.label}</span>
              <span className="mt-0.5 block text-sm text-fg-muted">
                {capFirst(fmt.weekday(exam.date))} {fmt.date(exam.date)}, ore 11:00
              </span>
            </span>
            <span className="flex shrink-0 items-baseline gap-1">
              <span className="font-display text-2xl leading-none text-fg">{hydrated ? days : "–"}</span>
              <span className="text-sm text-fg-muted">{days === 1 ? "giorno" : "giorni"}</span>
            </span>
          </Link>

          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="mt-4 first:mt-0">
              <div id={`more-${group.id}`} className="px-1 pb-1.5 text-xs font-medium text-fg-subtle">
                {group.label}
              </div>
              <ul aria-labelledby={`more-${group.id}`} className="overflow-hidden rounded-card border border-white/[0.07] bg-white/[0.02]">
                {NAV.filter((n) => n.group === group.id).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.id} className="border-t border-white/[0.05] first:border-t-0">
                      <Link
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn("flex h-12 items-center gap-3 px-4 text-base transition-colors", active ? "bg-azure-500/[0.08] text-fg" : "text-fg-muted active:bg-white/[0.04]")}
                      >
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-azure-300" : "text-fg-subtle")} strokeWidth={1.75} aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.id === "flashcard" && hydrated && due.length > 0 && <span className="rounded-md bg-azure-500/15 px-1.5 text-xs tabular-nums leading-5 text-azure-200">{due.length}</span>}
                        <ChevronRight className="h-4 w-4 shrink-0 text-fg-faint" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}
