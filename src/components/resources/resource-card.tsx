"use client";

import { ArrowUpRight, BookOpen, CalendarCheck, CalendarPlus, Crown, Globe, GraduationCap, Heart, MonitorPlay } from "lucide-react";
import type { Resource } from "@/lib/types";
import { useAtlas } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ResourceCover } from "./resource-cover";
import { KIND_LABEL, LANG_LABEL, LEVEL_LABEL, ctaLabel, sourceLabel } from "./catalog";

export { LANG_LABEL };

const KIND_ICON: Record<Resource["kind"], typeof MonitorPlay> = {
  videolezione: MonitorPlay,
  libro: BookOpen,
  piattaforma: Globe,
  corso: GraduationCap,
  playlist: GraduationCap,
};

/** Free or premium, said once, on the cover. */
export function AccessBadge({ premium, className }: { premium: boolean; className?: string }) {
  return premium ? (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-chip border border-gold-400/55 bg-ink-950/80 px-2 text-xs font-semibold text-gold-200 backdrop-blur-sm", className)}>
      <Crown className="h-3 w-3" aria-hidden /> Premium
    </span>
  ) : (
    <span className={cn("inline-flex h-6 items-center rounded-chip border border-azure-400/55 bg-ink-950/80 px-2 text-xs font-semibold text-azure-200 backdrop-blur-sm", className)}>Free</span>
  );
}

function Duration({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("rounded-md bg-ink-950/85 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white backdrop-blur-sm", className)}>
      <span className="sr-only">Durata </span>
      {value}
    </span>
  );
}

/** Favourite and "add to plan": two small toggles above the card's stretched link. */
function CardActions({ r, compact }: { r: Resource; compact?: boolean }) {
  const hydrated = useHydrated();
  const favorites = useAtlas((s) => s.favorites);
  const planned = useAtlas((s) => s.plannedResources);
  const toggleFavorite = useAtlas((s) => s.toggleFavorite);
  const addToPlan = useAtlas((s) => s.addResourceToPlan);
  const removeFromPlan = useAtlas((s) => s.removeResourceFromPlan);
  const fav = hydrated && favorites.includes(r.id);
  const inPlan = hydrated && planned.some((p) => p.resourceId === r.id);
  const name = r.titleIt ?? r.title;
  const size = compact ? "h-11 w-11 sm:h-8 sm:w-8" : "h-11 w-11 sm:h-9 sm:w-9";
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => {
          toggleFavorite(r.id);
          toast(fav ? "Rimossa dai preferiti" : "Salvata nei preferiti", { tone: fav ? "info" : "success", description: fav ? undefined : "La ritrovi con il filtro Preferiti." });
        }}
        className={cn(
          "grid place-items-center rounded-control transition-colors duration-150",
          size,
          fav ? "bg-rose-500/[0.12] text-rose-300 hover:bg-rose-500/20" : "text-fg-subtle hover:bg-white/[0.06] hover:text-fg",
        )}
        aria-pressed={fav}
        aria-label={`Salva nei preferiti: ${name}`}
        title={fav ? "Nei preferiti" : "Salva nei preferiti"}
      >
        <Heart className={cn("h-4 w-4", fav && "fill-current")} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => {
          if (inPlan) removeFromPlan(r.id);
          else addToPlan({ resourceId: r.id, title: name, url: r.url });
          toast(inPlan ? "Rimossa dal piano di studio" : "Aggiunta al piano di studio", { tone: inPlan ? "info" : "success", description: inPlan ? undefined : "La trovi nel Calendario, tra le risorse del piano." });
        }}
        className={cn(
          "grid place-items-center rounded-control transition-colors duration-150",
          size,
          inPlan ? "bg-success/[0.12] text-green-300 hover:bg-success/20" : "text-fg-subtle hover:bg-white/[0.06] hover:text-fg",
        )}
        aria-pressed={inPlan}
        aria-label={`Aggiungi al piano di studio: ${name}`}
        title={inPlan ? "Nel piano di studio" : "Aggiungi al piano di studio"}
      >
        {inPlan ? <CalendarCheck className="h-4 w-4" aria-hidden /> : <CalendarPlus className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}

/**
 * The card's only link. Its ::after covers the whole card, so the cover and the
 * title are clickable too, while the keyboard meets a single tab stop.
 */
function CardLink({ r, className, children }: { r: Resource; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:content-['']", className)}
    >
      {children}
      <span className="sr-only">
        : {r.titleIt ?? r.title}, {sourceLabel(r)} (si apre in una nuova scheda)
      </span>
    </a>
  );
}

type Variant = "grid" | "feature" | "row";

export function ResourceCard({
  r,
  featured,
  variant: variantProp,
  showKind = true,
  headingLevel = "h3",
}: {
  r: Resource;
  /** Legacy alias for `variant="feature"`. */
  featured?: boolean;
  variant?: Variant;
  /** Hide the kind icon when the surrounding section already says it. */
  showKind?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const variant: Variant = variantProp ?? (featured ? "feature" : "grid");
  const premium = r.access === "premium";
  const foreign = r.language !== "it" && r.titleIt && r.titleIt !== r.title;
  const KindIcon = KIND_ICON[r.kind];
  const Heading = headingLevel;
  const accent = premium ? "text-gold-300 group-hover:text-gold-200" : "text-azure-300 group-hover:text-azure-200";
  const shell = cn(
    "group card relative transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "has-[a:focus-visible]:border-azure-400/60 has-[a:focus-visible]:shadow-[0_0_0_3px_rgb(61_139_255/0.18)]",
    premium ? "border-gold-400/25 hover:border-gold-300/45" : "hover:border-white/[0.16] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
  );

  const source = (
    <p className="flex min-w-0 items-center gap-1.5 text-ui text-fg-muted">
      {showKind && (
        <>
          <KindIcon className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <span className="sr-only">{KIND_LABEL[r.kind]} di </span>
        </>
      )}
      <span className="truncate">{sourceLabel(r)}</span>
    </p>
  );

  const meta = (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Lingua e livello">
      <li className={cn("inline-flex h-6 items-center rounded-chip border px-2 text-xs font-medium", r.language === "it" ? "border-azure-400/30 bg-azure-500/[0.1] text-azure-200" : "border-white/10 bg-white/[0.04] text-fg-muted")}>
        {LANG_LABEL[r.language]}
      </li>
      <li className="inline-flex h-6 items-center rounded-chip border border-white/10 bg-white/[0.04] px-2 text-xs font-medium text-fg-muted">{LEVEL_LABEL[r.level]}</li>
    </ul>
  );

  if (variant === "row") {
    return (
      <article className={cn(shell, "flex gap-3.5 p-2.5 sm:gap-4")}>
        <div className="relative aspect-video w-32 shrink-0 self-start overflow-hidden rounded-lg sm:w-40">
          <ResourceCover r={r} size="row" className="transition-[filter] duration-200 group-hover:brightness-110" />
          {r.duration && <Duration value={r.duration} className="absolute bottom-1.5 right-1.5" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          {source}
          <Heading className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-fg">
            <CardLink r={r} className="focus-visible:outline-offset-4">
              {r.titleIt ?? r.title}
            </CardLink>
          </Heading>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className={cn("text-xs font-medium", r.language === "it" ? "text-azure-200" : "text-fg-muted")}>{LANG_LABEL[r.language]}</span>
            <CardActions r={r} compact />
          </div>
        </div>
      </article>
    );
  }

  const feature = variant === "feature";
  return (
    <article className={cn(shell, "flex h-full flex-col overflow-hidden")}>
      <div className="relative aspect-video overflow-hidden border-b border-white/[0.06]">
        <ResourceCover r={r} size={feature ? "feature" : "card"} className="transition-[filter] duration-200 group-hover:brightness-110" />
        <AccessBadge premium={premium} className="absolute left-3 top-3" />
        {r.duration && r.kind === "videolezione" && <Duration value={r.duration} className="absolute bottom-3 right-3" />}
      </div>

      <div className={cn("flex flex-1 flex-col", feature ? "p-5 sm:p-6" : "p-4 sm:p-5")}>
        {source}
        {/* Size first, then leading: tailwind-merge drops a leading-* that precedes a text size. */}
        <Heading className={cn("mt-2 font-display font-normal tracking-[-0.01em] text-fg", feature ? "text-[1.75rem] sm:text-3xl" : "text-xl", "leading-[1.15]")}>{r.titleIt ?? r.title}</Heading>
        {foreign && (
          <p className="mt-1 line-clamp-1 text-xs text-fg-subtle">
            Titolo originale: <span lang="en">{r.title}</span>
          </p>
        )}
        {r.authors?.length ? <p className="mt-2 line-clamp-1 text-ui text-fg-muted">{r.authors.join(", ")}</p> : null}
        <p className={cn("mt-2.5 leading-relaxed text-fg-muted", feature ? "line-clamp-3 max-w-[60ch] text-base" : "line-clamp-3 text-sm")}>{r.description}</p>
        {r.priceNote && !premium && <p className="mt-2 text-xs leading-snug text-fg-subtle">{r.priceNote}</p>}
        {premium && (
          <p className="mt-3 text-sm font-medium text-gold-200">
            {r.price ?? "Prezzo sul sito ufficiale"}
            {r.priceNote && <span className="mt-0.5 block text-xs font-normal leading-snug text-fg-subtle">{r.priceNote}</span>}
          </p>
        )}

        <div className="mt-auto pt-4">
          {meta}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <CardLink r={r} className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold transition-colors duration-150 sm:min-h-9", accent)}>
              {ctaLabel(r)}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px" aria-hidden />
            </CardLink>
            <CardActions r={r} />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Compact list used inside study sessions and topic pages. */
export function ResourceMiniList({ resources }: { resources: Resource[] }) {
  if (!resources.length) return <p className="text-sm text-fg-muted">Nessuna risorsa del catalogo verificato per questo argomento: cerca in Study Resources.</p>;
  return (
    <ul className="grid gap-2.5 md:grid-cols-2">
      {resources.map((r) => {
        const premium = r.access === "premium";
        return (
          <li key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex gap-3 rounded-card border p-2.5 transition-colors duration-150",
                premium ? "border-gold-400/25 hover:border-gold-300/50" : "border-white/[0.07] hover:border-white/[0.16] hover:bg-white/[0.02]",
              )}
            >
              <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg">
                <ResourceCover r={r} size="thumb" />
                {r.duration && r.kind === "videolezione" && <Duration value={r.duration} className="absolute bottom-1 right-1" />}
              </div>
              <div className="min-w-0 py-0.5">
                <div className="line-clamp-2 text-sm font-medium leading-snug text-fg">{r.titleIt ?? r.title}</div>
                <div className="mt-1 truncate text-xs text-fg-muted">
                  {sourceLabel(r)}, {LANG_LABEL[r.language].toLowerCase()}
                </div>
                <span className={cn("mt-1.5 inline-flex items-center gap-1 text-xs font-semibold", premium ? "text-gold-300" : "text-azure-300")}>
                  {premium && <Crown className="h-3 w-3" aria-hidden />}
                  {premium ? "Premium" : "Free"}
                  <span className="sr-only"> (si apre in una nuova scheda)</span>
                </span>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
