"use client";

import { useEffect, useState } from "react";
import { Crown, ShieldCheck, Info } from "lucide-react";
import { Sheet } from "@/components/ui/primitives";
import { ResourceCard } from "./resource-card";
import { RESOURCES } from "@/data/resources";
import { cn } from "@/lib/utils";

/**
 * On small screens the button tucks away while the user scrolls down (so it never
 * sits over a control they are reaching for) and comes back on scroll-up or at the
 * end of the page.
 */
function useTuckOnScroll() {
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 80;
      if (window.innerWidth >= 1024 || atEnd || y < 120) setTucked(false);
      else if (Math.abs(y - last) > 6) setTucked(y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return tucked;
}

/**
 * Floating gold "$" button (bottom-right). On mobile it sits above the bottom
 * navigation; pages that show it reserve bottom padding so it never covers controls.
 */
export function PremiumFab() {
  const [open, setOpen] = useState(false);
  const tucked = useTuckOnScroll();
  const premium = RESOURCES.filter((r) => r.access === "premium");
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Apri le risorse premium (${premium.length})`}
        tabIndex={tucked ? -1 : 0}
        className={cn(
          "fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-2xl border border-gold-300/60 bg-gradient-to-b from-[#2a2008] to-[#140f04] text-gold-300 transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse-gold",
          "bottom-[calc(env(safe-area-inset-bottom)+84px)] lg:bottom-8 lg:right-8",
          tucked && "pointer-events-none translate-x-24 opacity-0",
        )}
      >
        <span className="font-display text-[30px] leading-none text-gradient-gold [text-shadow:0_0_18px_rgba(239,197,92,0.65)]">$</span>
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 font-mono text-[10px] font-semibold text-ink-950">{premium.length}</span>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        tone="gold"
        width="max-w-2xl"
        title={
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold-300/40 bg-gold-500/10 text-gold-300">
              <Crown className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[15px] font-semibold text-gradient-gold">Risorse premium</div>
              <div className="text-[11.5px] text-gold-200/60">Corsi, manuali e piattaforme a pagamento</div>
            </div>
          </div>
        }
      >
        <div className="space-y-4 p-5">
          <div className="flex gap-2.5 rounded-2xl border border-gold-400/20 bg-gold-500/[0.05] p-3.5 text-[12.5px] leading-relaxed text-gold-100/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
            <p>
              ATLAS non riceve commissioni e non vende questi prodotti. I prezzi sono riportati solo se letti sulla pagina ufficiale (con data); altrimenti è indicato «Prezzo sul sito ufficiale». Le risorse gratuite restano sempre accessibili nella pagina principale.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {premium.map((r) => (
              <ResourceCard key={r.id} r={r} />
            ))}
          </div>
          <p className="flex items-center gap-1.5 pb-4 text-[11.5px] text-fg-subtle">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> URL e prezzi verificati il 19/10/2026.
          </p>
        </div>
      </Sheet>
    </>
  );
}
