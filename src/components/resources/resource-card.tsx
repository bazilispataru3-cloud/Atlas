"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, CalendarPlus, CalendarCheck, Play, ArrowUpRight, Clock, Languages, GraduationCap, Crown, BadgeCheck, BookOpen, MonitorPlay, Globe } from "lucide-react";
import type { Resource } from "@/lib/types";
import { CoverArt } from "./cover-art";
import { useAtlas } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export const LANG_LABEL: Record<Resource["language"], string> = { it: "Italiano", en: "Inglese", fr: "Francese", es: "Spagnolo", de: "Tedesco", multi: "Multilingue" };
const LEVEL_LABEL: Record<Resource["level"], string> = { introduttivo: "Introduttivo", universitario: "Universitario", avanzato: "Avanzato" };
const KIND_LABEL: Record<Resource["kind"], string> = { corso: "Corso", videolezione: "Videolezione", libro: "Manuale", piattaforma: "Piattaforma", playlist: "Playlist" };

function Thumb({ r, className }: { r: Resource; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // An error that happens before hydration is not replayed to React.
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (r.youtubeId && !failed) {
    return (
      // hqdefault exists for every video; its 4:3 letterbox is cropped to 16:9 by object-cover.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        src={`https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        onLoad={(e) => e.currentTarget.naturalWidth <= 120 && setFailed(true)}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return <CoverArt motif={r.cover?.motif ?? "lattice"} seed={r.cover?.seed ?? r.id.length} premium={r.access === "premium"} className={cn("h-full w-full", className)} />;
}

export function ResourceCard({ r, featured }: { r: Resource; featured?: boolean }) {
  const hydrated = useHydrated();
  const favorites = useAtlas((s) => s.favorites);
  const planned = useAtlas((s) => s.plannedResources);
  const toggleFavorite = useAtlas((s) => s.toggleFavorite);
  const addToPlan = useAtlas((s) => s.addResourceToPlan);
  const removeFromPlan = useAtlas((s) => s.removeResourceFromPlan);
  const fav = hydrated && favorites.includes(r.id);
  const inPlan = hydrated && planned.some((p) => p.resourceId === r.id);
  const premium = r.access === "premium";
  const foreign = r.language !== "it" && r.titleIt;
  const KindIcon = r.kind === "videolezione" ? MonitorPlay : r.kind === "libro" ? BookOpen : r.kind === "piattaforma" ? Globe : GraduationCap;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border bg-ink-850/90 transition-all duration-300 hover:-translate-y-1",
        premium
          ? "border-gold-400/30 shadow-[0_0_0_1px_rgba(239,197,92,0.06)] hover:border-gold-300/60 hover:shadow-[0_0_0_1px_rgba(246,220,143,0.35),0_18px_50px_-18px_rgba(226,170,47,0.55)]"
          : "border-azure-400/20 hover:border-azure-300/55 hover:shadow-[0_0_0_1px_rgba(143,196,255,0.3),0_18px_50px_-18px_rgba(47,139,255,0.55)]",
      )}
    >
      {/* Whole-card link; interactive controls sit above it. */}
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-[1]" aria-label={`Apri ${r.titleIt ?? r.title} (${r.provider}) in una nuova scheda`} />

      <div className="relative aspect-video overflow-hidden">
        <Thumb r={r} className="transition-transform duration-700 group-hover:scale-[1.04]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          {premium ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-300/50 bg-black/55 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.14em] text-gold-200 backdrop-blur">
              <Crown className="h-3 w-3" /> PREMIUM
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-azure-300/50 bg-black/55 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.16em] text-azure-200 shadow-[0_0_14px_rgba(86,166,255,0.45)] backdrop-blur">FREE</span>
          )}
          {!r.youtubeId && <span className="rounded-full bg-black/50 px-2 py-1 text-[10px] text-white/70 backdrop-blur">Illustrazione ATLAS</span>}
        </div>
        {r.duration && (
          <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white">{r.duration}</span>
        )}
        {r.youtubeId && (
          <span className={cn("absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full opacity-0 backdrop-blur transition group-hover:opacity-100", premium ? "bg-gold-400/80 text-ink-950" : "bg-azure-500/85 text-white")}>
            <Play className="h-5 w-5 fill-current" />
          </span>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col p-4", featured && "sm:p-5")}>
        <div className={cn("flex items-center gap-1.5 text-[11.5px] font-medium", premium ? "text-gold-300" : "text-azure-300")}>
          <KindIcon className="h-3.5 w-3.5" />
          {KIND_LABEL[r.kind]} · <span className="truncate">{r.institution ?? r.provider}</span>
        </div>
        <h3 className={cn("mt-1.5 font-semibold leading-snug text-fg", featured ? "text-[17px]" : "text-[15px]")}>{r.titleIt ?? r.title}</h3>
        {foreign && <div className="mt-0.5 line-clamp-1 text-[11.5px] italic text-fg-subtle">Titolo originale: {r.title}</div>}
        {r.authors?.length ? (
          <div className="mt-1.5 flex items-center gap-1 text-[12.5px] text-fg-muted">
            <BadgeCheck className={cn("h-3.5 w-3.5 shrink-0", premium ? "text-gold-300" : "text-azure-300")} />
            <span className="line-clamp-1">{r.authors.join(", ")}</span>
          </div>
        ) : null}
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-fg-subtle">{r.description}</p>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-fg-subtle">
          <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" /> {LANG_LABEL[r.language]}</span>
          <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {LEVEL_LABEL[r.level]}</span>
          {r.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.duration}</span>}
          <span>{r.provider}</span>
        </div>

        {premium && (
          <div className="mt-3 rounded-xl border border-gold-400/20 bg-gold-500/[0.06] px-3 py-2">
            <div className="text-[13px] font-medium text-gold-200">{r.price ?? "Prezzo sul sito ufficiale"}</div>
            {r.priceNote && <div className="mt-0.5 text-[11px] leading-snug text-gold-200/60">{r.priceNote}</div>}
          </div>
        )}
        {!premium && r.priceNote && <div className="mt-2 text-[11px] leading-snug text-fg-subtle">{r.priceNote}</div>}

        <div className="relative z-[2] mt-auto flex items-center gap-2 pt-4">
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition",
              premium
                ? "bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 hover:from-gold-200 hover:to-gold-400"
                : "bg-azure-500/15 text-azure-100 ring-1 ring-inset ring-azure-400/40 hover:bg-azure-500 hover:text-white",
            )}
          >
            {premium ? "Scopri il corso" : r.kind === "videolezione" ? "Guarda gratuitamente" : "Apri corso"} <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={() => {
              toggleFavorite(r.id);
              toast(fav ? "Rimosso dai preferiti" : "Salvato nei preferiti", { tone: fav ? "info" : "success" });
            }}
            className={cn("grid h-9 w-9 place-items-center rounded-xl border transition", fav ? "border-rose-400/40 bg-rose-500/15 text-rose-300" : "border-white/10 text-fg-subtle hover:text-fg")}
            aria-pressed={fav}
            aria-label={fav ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
          >
            <Heart className={cn("h-4 w-4", fav && "fill-current")} />
          </button>
          <button
            onClick={() => {
              if (inPlan) removeFromPlan(r.id);
              else addToPlan({ resourceId: r.id, title: r.titleIt ?? r.title, url: r.url });
              toast(inPlan ? "Rimosso dal piano di studio" : "Aggiunto al piano di studio", { tone: inPlan ? "info" : "success", description: inPlan ? undefined : "Lo trovi nel Calendario, tra le risorse del piano." });
            }}
            className={cn("grid h-9 w-9 place-items-center rounded-xl border transition", inPlan ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-fg-subtle hover:text-fg")}
            aria-pressed={inPlan}
            aria-label={inPlan ? "Rimuovi dal piano di studio" : "Aggiungi al piano di studio"}
          >
            {inPlan ? <CalendarCheck className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}

/** Compact list used inside study sessions and topic pages. */
export function ResourceMiniList({ resources }: { resources: Resource[] }) {
  if (!resources.length) return <p className="text-[13px] text-fg-subtle">Nessuna risorsa verificata nel catalogo per questo argomento: usa la ricerca in Study Resources.</p>;
  return (
    <ul className="grid gap-2.5 md:grid-cols-2">
      {resources.map((r) => (
        <li key={r.id}>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group flex gap-3 rounded-2xl border p-2.5 transition",
              r.access === "premium" ? "border-gold-400/25 hover:border-gold-300/50" : "border-white/[0.07] hover:border-azure-400/40 hover:bg-azure-500/[0.04]",
            )}
          >
            <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl">
              <Thumb r={r} />
              {r.duration && <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 font-mono text-[10px] text-white">{r.duration}</span>}
            </div>
            <div className="min-w-0 py-0.5">
              <div className="line-clamp-2 text-[13px] font-medium leading-snug text-fg">{r.titleIt ?? r.title}</div>
              <div className="mt-1 truncate text-[11.5px] text-fg-subtle">{r.institution ?? r.provider} · {LANG_LABEL[r.language]}</div>
              <span className={cn("mt-1 inline-block text-[10px] font-semibold tracking-[0.14em]", r.access === "premium" ? "text-gold-300" : "text-azure-300")}>{r.access === "premium" ? "PREMIUM" : "FREE"}</span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
