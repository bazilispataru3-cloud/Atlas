"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play } from "lucide-react";
import { NAV, isActive } from "./nav";
import { Logo } from "./logo";
import { cn, daysBetween, fmt } from "@/lib/utils";
import { useUI } from "@/lib/ui-store";
import { useAtlas } from "@/lib/store";
import { useHydrated, useDueCards } from "@/lib/hooks";
import { EXAM_DATES } from "@/data/exam";

const GROUP_LABEL = { studio: "Studio", strumenti: "Strumenti", account: "Account" } as const;

export function Sidebar() {
  const pathname = usePathname();
  const openStartStudy = useUI((s) => s.openStartStudy);
  const hydrated = useHydrated();
  const due = useDueCards();
  const profile = useAtlas((s) => s.profile);
  const exam = EXAM_DATES.find((e) => e.id === profile.examTarget) ?? EXAM_DATES[0];
  const days = daysBetween(new Date(), exam.date);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/[0.06] bg-ink-900/80 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="ATLAS STUDY — Dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-4 pb-2">
        <button
          onClick={() => openStartStudy()}
          className="group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-azure-500 text-sm font-semibold tracking-wide text-white shadow-[0_0_0_1px_rgba(143,196,255,0.35)_inset,0_10px_30px_-10px_rgba(47,139,255,0.9)] transition hover:bg-azure-400"
        >
          <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.25)_50%,transparent_70%)] bg-[length:200%_100%] opacity-0 transition group-hover:opacity-100 group-hover:animate-shimmer" />
          <Play className="h-4 w-4 fill-current" />
          INIZIA A STUDIARE
        </button>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigazione principale">
        {(["studio", "strumenti", "account"] as const).map((group) => (
          <div key={group} className="mt-4 first:mt-2">
            <div className="px-3 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-fg-subtle/80">{GROUP_LABEL[group]}</div>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors",
                        active ? "bg-white/[0.07] text-fg" : "text-fg-muted hover:bg-white/[0.04] hover:text-fg",
                      )}
                    >
                      {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-azure-400 shadow-[0_0_10px_rgba(86,166,255,0.9)]" />}
                      <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-azure-300" : "text-fg-subtle group-hover:text-fg-muted")} strokeWidth={1.8} />
                      <span className="truncate">{item.label}</span>
                      {item.id === "flashcard" && hydrated && due.length > 0 && (
                        <span className="ml-auto rounded-full bg-azure-500/20 px-1.5 py-px font-mono text-[10.5px] text-azure-200">{due.length}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <Link href="/calendario" className="block rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-white/15">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">{exam.label}</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-medium text-fg tabular-nums">{hydrated ? Math.max(0, days) : "–"}</span>
            <span className="text-xs text-fg-muted">giorni</span>
          </div>
          <div className="mt-0.5 text-[11.5px] capitalize text-fg-subtle">{fmt.weekday(exam.date)} {fmt.date(exam.date)} · 11:00</div>
        </Link>
      </div>
    </aside>
  );
}
