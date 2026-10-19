"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Sparkles, GalleryVerticalEnd, FlaskConical } from "lucide-react";
import { Logo } from "./logo";
import { NAV, isActive } from "./nav";
import { useUI } from "@/lib/ui-store";
import { useAtlas } from "@/lib/store";
import { useDueCards, useHydrated } from "@/lib/hooks";
import { CommandPalette } from "./command-palette";
import { Kbd } from "@/components/ui/primitives";

export function Topbar() {
  const pathname = usePathname();
  const openProfessor = useUI((s) => s.openProfessor);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const hydrated = useHydrated();
  const demo = useAtlas((s) => s.demo);
  const due = useDueCards();
  const current = NAV.find((n) => isActive(pathname, n.href));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/[0.05] bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-10">
          <Link href="/" className="lg:hidden" aria-label="Dashboard">
            <Logo compact />
          </Link>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-fg-subtle lg:flex">
            <span className="text-fg-muted">{current?.label ?? (pathname.startsWith("/studio/") ? "Sessione di studio" : "ATLAS STUDY")}</span>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-fg-subtle transition hover:border-white/15 hover:text-fg-muted sm:w-64 lg:ml-6 lg:w-80"
            aria-label="Cerca argomenti, tecniche e sezioni"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Cerca argomenti, tecniche…</span>
            <span className="ml-auto hidden items-center gap-1 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          <div className="flex items-center gap-1.5 lg:ml-auto">
            {hydrated && demo && (
              <Link href="/profilo#dati" className="hidden items-center gap-1.5 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] font-medium text-fuchsia-200 md:flex" title="Stai visualizzando dati dimostrativi">
                <FlaskConical className="h-3.5 w-3.5" /> Dati demo
              </Link>
            )}
            <Link
              href="/flashcard/ripasso"
              className="relative hidden h-9 items-center gap-2 rounded-xl px-2.5 text-[13px] text-fg-muted transition hover:bg-white/[0.05] hover:text-fg sm:flex"
              aria-label={`Flashcard in scadenza: ${hydrated ? due.length : 0}`}
            >
              <GalleryVerticalEnd className="h-4 w-4" />
              <span className="font-mono tabular-nums">{hydrated ? due.length : "–"}</span>
            </Link>
            <button
              onClick={() => openProfessor()}
              className="flex h-9 items-center gap-2 rounded-xl border border-azure-400/25 bg-azure-500/10 px-3 text-[13px] font-medium text-azure-200 transition hover:border-azure-300/50 hover:bg-azure-500/20 hover:shadow-[0_0_20px_-6px_rgba(47,139,255,0.8)]"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Professor</span>
            </button>
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
