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
import { Kbd, useModKey } from "@/components/ui/primitives";

export function Topbar() {
  const pathname = usePathname();
  const openProfessor = useUI((s) => s.openProfessor);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const hydrated = useHydrated();
  const demo = useAtlas((s) => s.demo);
  const due = useDueCards();
  const mod = useModKey();
  const current = NAV.find((n) => isActive(pathname, n.href));
  const place = current?.label ?? (pathname.startsWith("/studio/") ? "Sessione di studio" : "ATLAS STUDY");

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
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/[0.96] pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-10">
          <Link href="/" className="shrink-0 rounded-lg lg:hidden" aria-label="ATLAS STUDY, vai alla dashboard">
            <Logo compact />
          </Link>
          <div className="hidden min-w-0 text-sm font-medium text-fg-muted lg:block">
            <span className="truncate">{place}</span>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-control border border-white/[0.08] bg-white/[0.03] text-ui text-fg-muted transition-colors duration-150 hover:border-white/[0.15] hover:text-fg sm:w-64 sm:justify-start sm:px-3 lg:ml-8 lg:w-80"
            aria-label="Cerca argomenti, tecniche e sezioni"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden truncate sm:inline">Cerca argomenti, tecniche…</span>
            <span className="ml-auto hidden items-center gap-1 sm:flex" aria-hidden>
              <Kbd>{mod}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 lg:ml-auto">
            {hydrated && demo && (
              <Link
                href="/profilo#dati"
                className="flex h-10 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
                aria-label="Stai usando dati dimostrativi: gestiscili dal profilo"
              >
                <FlaskConical className="h-4 w-4" aria-hidden />
                <span className="hidden md:inline">Dati demo</span>
              </Link>
            )}
            <Link
              href="/flashcard/ripasso"
              className="hidden h-10 items-center gap-1.5 rounded-control px-2.5 text-ui text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg sm:flex"
              aria-label={hydrated ? `Ripassa ${due.length} flashcard in scadenza` : "Ripassa le flashcard in scadenza"}
            >
              <GalleryVerticalEnd className="h-4 w-4" aria-hidden />
              <span className="tabular-nums" aria-hidden>
                {hydrated ? due.length : "–"}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => openProfessor()}
              aria-label="Apri AI Professor"
              className="flex h-10 items-center gap-2 rounded-control border border-azure-400/25 bg-azure-500/10 px-3 text-ui font-medium text-azure-200 transition-[background-color,border-color,box-shadow] duration-150 hover:border-azure-300/45 hover:bg-azure-500/[0.18] hover:shadow-[0_0_20px_-6px_rgb(61_139_255/0.8)]"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="hidden whitespace-nowrap sm:inline">AI Professor</span>
            </button>
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
