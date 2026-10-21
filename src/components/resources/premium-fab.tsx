"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Crown, ShieldCheck } from "lucide-react";
import type { Resource } from "@/lib/types";
import { Sheet } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { PREMIUM, formatDay, sourceLabel } from "./catalog";
import { ResourceCover } from "./resource-cover";

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Phones and tablets: the button tucks away while the student scrolls down (so
 * it never sits on a control they are reaching for) and comes back on scroll-up
 * and at the end of the page. On desktop it lives in a lane the page reserves on
 * the right, so it never covers content and stays put. On every layout, when
 * scrolling stops with the button over a link, button or field of the page, it
 * steps aside until the next scroll.
 */
function useTuckOnScroll(fab: React.RefObject<HTMLButtonElement | null>, hideWhileVisible?: string) {
  const [tucked, setTucked] = useState(false);
  const [twinVisible, setTwinVisible] = useState(false);
  const [covering, setCovering] = useState(false);
  useEffect(() => {
    // Below desktop the page header already shows "Risorse premium": the floating
    // button waits until that button has scrolled away, so it never sits on the first screen.
    const el = hideWhileVisible ? document.getElementById(hideWhileVisible) : null;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTwinVisible(e.isIntersecting && window.innerWidth < 1024));
    io.observe(el);
    return () => io.disconnect();
  }, [hideWhileVisible]);
  useEffect(() => {
    let last = window.scrollY;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const btn = fab.current;
      if (!btn) return;
      // Where the button sits when shown (a tucked button is moved 16px down).
      const r = btn.getBoundingClientRect();
      const dy = btn.dataset.tucked === "true" ? 16 : 0;
      const box = { l: r.left - 6, r: r.right + 6, t: r.top - dy - 6, b: r.bottom - dy + 6 };
      const hit = [...document.querySelectorAll<HTMLElement>("main a[href], main button, main input, main select, main textarea, main summary")].some((c) => {
        if (c === btn || c.closest("[role=dialog]")) return false;
        const q = c.getBoundingClientRect();
        return q.width > 0 && q.right > box.l && q.left < box.r && q.bottom > box.t && q.top < box.b;
      });
      setCovering(hit);
    };
    const onScroll = () => {
      const y = window.scrollY;
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 120;
      if (window.innerWidth >= 1024 || atEnd) setTucked(false);
      else if (Math.abs(y - last) > 8) setTucked(y > last);
      last = y;
      clearTimeout(idle);
      idle = setTimeout(check, 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    idle = setTimeout(check, 400);
    return () => {
      clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [fab]);
  return tucked || twinVisible || covering;
}

const GROUPS: { id: string; title: string; test: (r: Resource) => boolean }[] = [
  { id: "abbonamenti", title: "Abbonamenti e piattaforme", test: (r) => r.kind === "piattaforma" },
  { id: "corsi", title: "Corsi", test: (r) => r.kind === "corso" || r.kind === "playlist" || r.kind === "videolezione" },
  { id: "manuali", title: "Manuali e preparazione al test", test: (r) => r.kind === "libro" },
];

const VERIFIED = PREMIUM.reduce((max, r) => (r.verifiedOn > max ? r.verifiedOn : max), "");

function PremiumRow({ r }: { r: Resource }) {
  return (
    <li className="group relative grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3.5 py-3.5 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center">
      <div className="aspect-video overflow-hidden rounded-lg border border-white/[0.06]">
        <ResourceCover r={r} size="thumb" className="transition-[filter] duration-200 group-hover:brightness-110" />
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-medium leading-snug text-fg">
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm after:absolute after:inset-0 after:content-[''] group-hover:text-gold-200"
          >
            {r.titleIt ?? r.title}
            <span className="sr-only"> ({sourceLabel(r)}, si apre in una nuova scheda)</span>
          </a>
        </h4>
        <p className="mt-0.5 truncate text-xs text-fg-muted">{sourceLabel(r)}</p>
        {r.priceNote && <p className="mt-1 line-clamp-2 text-xs leading-snug text-fg-subtle">{r.priceNote}</p>}
        {/* On phones the price sits under the name; from `sm` it has its own column. */}
        <p className={cn("mt-1.5 text-sm font-semibold sm:hidden", r.price ? "text-gold-200" : "text-fg-muted")}>{r.price ?? "Prezzo sul sito ufficiale"}</p>
      </div>
      <div className="hidden max-w-[9.5rem] items-center gap-2 text-right sm:flex">
        <span className={cn("text-sm leading-snug", r.price ? "font-semibold text-gold-200" : "text-fg-muted")}>{r.price ?? "Prezzo sul sito"}</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-gold-300/80 transition-colors group-hover:text-gold-200" aria-hidden />
      </div>
    </li>
  );
}

/** The premium window: a compact, gold-toned comparison list (name, provider, price as read on the official page). */
export function PremiumSheet({ open, onClose, focusIds = [] }: { open: boolean; onClose: () => void; focusIds?: string[] }) {
  const wide = useMedia("(min-width: 640px)");
  const titleId = useId();
  const focus = PREMIUM.filter((r) => focusIds.includes(r.id));
  const groups = [
    ...(focus.length ? [{ id: "pertinenti", title: "Collegate alla tua ricerca", items: focus }] : []),
    ...GROUPS.map((g) => ({ id: g.id, title: g.title, items: PREMIUM.filter((r) => g.test(r) && !focusIds.includes(r.id)) })),
  ].filter((g) => g.items.length);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      tone="gold"
      side={wide ? "right" : "bottom"}
      width="max-w-xl"
      title={
        <div className="flex items-center gap-3 py-1">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-gold-400/35 bg-gold-500/[0.1] text-gold-300" aria-hidden>
            <Crown className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-gold-200">
              Risorse premium
            </h2>
            <p className="text-xs text-fg-muted">Corsi, manuali e abbonamenti a pagamento</p>
          </div>
        </div>
      }
    >
      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <p className="flex gap-2 text-ui leading-relaxed text-fg-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" aria-hidden />
          <span>
            ATLAS non vende questi prodotti e non riceve commissioni. Prezzi letti sui siti ufficiali il {formatDay(VERIFIED)}.
          </span>
        </p>
        <details className="group/how mt-2 pl-6">
          <summary className="inline-flex min-h-8 cursor-pointer list-none items-center rounded-md text-ui font-medium text-gold-200 underline decoration-gold-400/40 underline-offset-4 hover:decoration-gold-300 [&::-webkit-details-marker]:hidden">
            Come verifichiamo i prezzi
          </summary>
          <p className="mt-1.5 max-w-[60ch] text-xs leading-relaxed text-fg-muted">
            Un prezzo compare solo se è pubblicato sulla pagina ufficiale: lo riportiamo con la data in cui l’abbiamo letto. Se la pagina non lo mostra, scriviamo «Prezzo sul sito ufficiale». Prezzi e promozioni possono cambiare: prima di acquistare controlla sempre il sito. Le risorse gratuite restano tutte nella pagina principale.
          </p>
        </details>

        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`${titleId}-${g.id}`} className="mt-6">
            <h3 id={`${titleId}-${g.id}`} className="flex items-baseline gap-2 text-sm font-semibold text-fg">
              {g.title}
              <span className="text-xs font-normal tabular-nums text-fg-subtle">{g.items.length}</span>
            </h3>
            <ul className="mt-1 divide-y divide-white/[0.06] border-b border-white/[0.06]">
              {g.items.map((r) => (
                <PremiumRow key={r.id} r={r} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}

/**
 * Floating gold "$" button, bottom-right. Above the tab bar on phones; on
 * desktop the page keeps a free lane for it on the right. Controlled by the page
 * (so the header button and the banner open the same window), or self-contained.
 */
export function PremiumFab({
  open: openProp,
  onOpenChange,
  focusIds,
  hideWhileVisible,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  focusIds?: string[];
  /** Id of an on-page button that opens the same window: below desktop the FAB hides while it is on screen. */
  hideWhileVisible?: string;
} = {}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setOpenState(v));
  const ref = useRef<HTMLButtonElement>(null);
  const tucked = useTuckOnScroll(ref, hideWhileVisible);
  return (
    <>
      <button
        ref={ref}
        type="button"
        data-tucked={tucked}
        onClick={() => setOpen(true)}
        aria-label={`Risorse premium (${PREMIUM.length})`}
        aria-haspopup="dialog"
        tabIndex={tucked ? -1 : 0}
        aria-hidden={tucked || undefined}
        className={cn(
          "group fixed right-4 z-30 grid h-13 w-13 place-items-center rounded-panel border border-gold-400/55 bg-gradient-to-b from-gold-900 to-ink-950",
          "shadow-[0_0_0_1px_rgb(239_193_79/0.5),0_0_14px_0_rgb(226_169_46/0.22),0_10px_28px_-12px_rgb(226_169_46/0.5)] animate-pulse-gold",
          "transition-[transform,opacity,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-gold-300/90 hover:shadow-[0_0_0_1px_rgb(244_210_122/0.75),0_0_24px_2px_rgb(226_169_46/0.32),0_10px_28px_-10px_rgb(226_169_46/0.6)] active:translate-y-px",
          "bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:right-6 lg:bottom-8",
          tucked && "pointer-events-none translate-y-4 opacity-0",
        )}
        // One slow glow when the page opens, then a steady, quiet light.
        style={{ animationIterationCount: 1 }}
      >
        <span aria-hidden className="font-display text-[28px] leading-none text-gradient-gold">
          $
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-control border border-gold-400/30 bg-ink-900/95 px-3 py-1.5 text-ui font-medium text-gold-200 opacity-0 shadow-overlay transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
        >
          Risorse premium
        </span>
      </button>
      <PremiumSheet open={open} onClose={() => setOpen(false)} focusIds={focusIds} />
    </>
  );
}
