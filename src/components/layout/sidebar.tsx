"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play } from "lucide-react";
import { NAV, NAV_GROUPS, isActive } from "./nav";
import { Logo } from "./logo";
import { capFirst, cn, daysBetween, fmt } from "@/lib/utils";
import { useUI } from "@/lib/ui-store";
import { useAtlas } from "@/lib/store";
import { useHydrated, useDueCards } from "@/lib/hooks";
import { EXAM_DATES } from "@/data/exam";

export function Sidebar() {
  const pathname = usePathname();
  const openStartStudy = useUI((s) => s.openStartStudy);
  const hydrated = useHydrated();
  const due = useDueCards();
  const profile = useAtlas((s) => s.profile);
  const exam = EXAM_DATES.find((e) => e.id === profile.examTarget) ?? EXAM_DATES[0];
  const days = Math.max(0, daysBetween(new Date(), exam.date));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/[0.06] bg-ink-900/85 backdrop-blur-xl lg:flex">
      <div className="flex h-14 shrink-0 items-center px-5">
        <Link href="/" aria-label="ATLAS STUDY, vai alla dashboard" className="rounded-lg">
          <Logo />
        </Link>
      </div>

      <div className="px-4 pb-1 pt-3">
        <button
          type="button"
          onClick={() => openStartStudy()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-azure-500 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_0_0_1px_rgb(61_139_255/0.55),0_8px_22px_-10px_rgb(26_102_255/0.9)] transition-[background-color,box-shadow] duration-150 hover:bg-azure-600 active:translate-y-px"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          Inizia a studiare
        </button>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigazione principale">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mt-5 first:mt-1">
            <div id={`nav-${group.id}`} className="px-3 pb-1.5 text-xs font-medium text-fg-subtle">
              {group.label}
            </div>
            <ul className="space-y-px" aria-labelledby={`nav-${group.id}`}>
              {NAV.filter((n) => n.group === group.id).map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150",
                        active ? "bg-white/[0.06] text-fg" : "text-fg-muted hover:bg-white/[0.035] hover:text-fg",
                      )}
                    >
                      {active && <span className="absolute -left-3 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-azure-400 shadow-[0_0_10px_rgb(61_139_255/0.9)]" aria-hidden />}
                      <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-azure-300" : "text-fg-subtle group-hover:text-fg-muted")} strokeWidth={1.75} aria-hidden />
                      <span className="truncate">{item.label}</span>
                      {item.id === "flashcard" && hydrated && due.length > 0 && (
                        <span className="ml-auto rounded-md bg-azure-500/15 px-1.5 text-xs font-medium tabular-nums leading-5 text-azure-200" aria-label={`${due.length} da ripassare`}>
                          {due.length}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <Link href="/calendario" className="group block rounded-card px-3 py-3 transition-colors duration-150 hover:bg-white/[0.035]">
          <div className="text-xs text-fg-subtle">{exam.label}</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-[1.75rem] leading-none text-fg">{hydrated ? days : "–"}</span>
            <span className="text-sm text-fg-muted">{days === 1 ? "giorno" : "giorni"}</span>
          </div>
          <div className="mt-1.5 text-xs text-fg-subtle">
            {capFirst(fmt.weekday(exam.date))} {fmt.date(exam.date)}, ore 11:00
          </div>
        </Link>
      </div>
    </aside>
  );
}
