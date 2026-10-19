"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ShieldCheck, Loader2, Sparkles, MonitorPlay, Globe2, Heart, Layers, X, Crown, Telescope } from "lucide-react";
import type { Resource, SubjectId } from "@/lib/types";
import { RESOURCES } from "@/data/resources";
import { getTopicRef, SUBJECTS } from "@/data/syllabus";
import { ResourceCard, LANG_LABEL } from "./resource-card";
import { PremiumFab } from "./premium-fab";
import { Badge, Button, Notice, PageHeader, Segmented, Select } from "@/components/ui/primitives";
import { useIntegrations } from "@/lib/ai-client";
import { useAtlas } from "@/lib/store";
import { useHydrated, useTopicStates } from "@/lib/hooks";
import { tokens } from "@/lib/search";
import { cn } from "@/lib/utils";

const LANGS: { id: Resource["language"]; label: string }[] = [
  { id: "it", label: "IT" },
  { id: "en", label: "EN" },
  { id: "fr", label: "FR" },
  { id: "es", label: "ES" },
  { id: "de", label: "DE" },
];

type Kind = "tutti" | "corso" | "videolezione" | "libro" | "piattaforma";

interface LiveResult {
  query: string;
  youtube: { status: "ok" | "not_configured" | "error"; items: Resource[]; message?: string; cached?: boolean };
  web: { status: "ok" | "not_configured" | "error"; items: Resource[]; message?: string; cached?: boolean };
}

function matches(r: Resource, q: string) {
  const qt = tokens(q);
  if (!qt.length) return true;
  const hay = tokens(`${r.title} ${r.titleIt ?? ""} ${r.description} ${r.provider} ${r.institution ?? ""} ${r.authors?.join(" ") ?? ""} ${r.topicTags.map((t) => getTopicRef(t)?.topic.title ?? "").join(" ")}`);
  const set = new Set(hay);
  const hits = qt.filter((t) => set.has(t) || hay.some((h) => h.length > 4 && t.length > 4 && (h.startsWith(t.slice(0, 5)) || t.startsWith(h.slice(0, 5))))).length;
  return hits / qt.length >= 0.5;
}

export function ResourcesPage() {
  const params = useSearchParams();
  const topicParam = params.get("topic");
  const initialRef = topicParam ? getTopicRef(topicParam) : undefined;
  const integrations = useIntegrations();
  const hydrated = useHydrated();
  const favorites = useAtlas((s) => s.favorites);
  const states = useTopicStates();

  const [query, setQuery] = useState(initialRef?.topic.title ?? "");
  const [submitted, setSubmitted] = useState(initialRef?.topic.title ?? "");
  const [subject, setSubject] = useState<SubjectId | "tutte">(initialRef?.subject.id ?? "tutte");
  const [kind, setKind] = useState<Kind>("tutti");
  const [langs, setLangs] = useState<Resource["language"][]>(["it", "en"]);
  const [level, setLevel] = useState<Resource["level"] | "tutti">("tutti");
  const [onlyFav, setOnlyFav] = useState(false);
  const [useWeb, setUseWeb] = useState(false);
  const [live, setLive] = useState<LiveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveAvailable = integrations && (integrations.youtube || integrations.webSearch);

  const runLive = async (q: string) => {
    if (!q.trim() || !liveAvailable) return;
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams({ q, langs: langs.filter((l) => l !== "multi").join(","), web: useWeb ? "1" : "0" });
    if (initialRef) sp.set("topicId", initialRef.topic.id);
    try {
      const res = await fetch(`/api/resources/search?${sp}`);
      const json = await res.json();
      if (!res.ok) setError(json.message ?? "Ricerca non disponibile.");
      else setLive(json);
    } catch {
      setError("Connessione non disponibile.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (submitted && liveAvailable) runLive(submitted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAvailable]);

  const catalog = useMemo(() => {
    return RESOURCES.filter((r) => r.access === "free")
      .filter((r) => subject === "tutte" || r.subjects.includes(subject))
      .filter((r) => kind === "tutti" || r.kind === kind || (kind === "corso" && r.kind === "playlist"))
      .filter((r) => r.language === "multi" || langs.includes(r.language))
      .filter((r) => level === "tutti" || r.level === level)
      .filter((r) => !onlyFav || favorites.includes(r.id))
      .filter((r) => matches(r, submitted));
  }, [subject, kind, langs, level, onlyFav, favorites, submitted]);

  const groups: { id: Kind; title: string; icon: React.ReactNode; items: Resource[] }[] = [
    { id: "corso", title: "Corsi universitari", icon: <Layers className="h-4 w-4" />, items: catalog.filter((r) => r.kind === "corso" || r.kind === "playlist") },
    { id: "videolezione", title: "Videolezioni", icon: <MonitorPlay className="h-4 w-4" />, items: catalog.filter((r) => r.kind === "videolezione") },
    { id: "libro", title: "Manuali aperti", icon: <Telescope className="h-4 w-4" />, items: catalog.filter((r) => r.kind === "libro") },
    { id: "piattaforma", title: "Piattaforme", icon: <Globe2 className="h-4 w-4" />, items: catalog.filter((r) => r.kind === "piattaforma") },
  ];

  const nextTopic = !hydrated ? undefined : states.find((s) => s.status === "da-consolidare") ?? states.find((s) => s.status === "in-corso") ?? states.find((s) => s.status === "nuovo");
  const featured = useMemo(() => {
    const id = initialRef?.topic.id ?? nextTopic?.ref.topic.id;
    if (!id) return [];
    return RESOURCES.filter((r) => r.access === "free" && r.topicTags.includes(id)).slice(0, 8);
  }, [initialRef, nextTopic]);
  const featuredRef = initialRef ?? nextTopic?.ref;

  const liveItems = [...(live?.youtube.items ?? []), ...(live?.web.items ?? [])];

  return (
    <div className="pb-28 lg:pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><Telescope className="h-3.5 w-3.5" /> Study Resources</span>}
        title={
          <>
            Una biblioteca di corsi universitari, <span className="italic text-gradient-azure">scelta per te</span>.
          </>
        }
        description="Videolezioni e corsi di MIT, Yale, OpenStax, Khan Academy, Federica e altri, collegati al syllabus. Ogni link del catalogo è stato aperto e verificato; la ricerca live usa le API ufficiali di YouTube e una ricerca web limitata a domini accademici."
      />

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
          runLive(query);
        }}
        className="mt-8 rounded-3xl border border-white/[0.08] bg-ink-850/80 p-3 shadow-[0_30px_80px_-40px_rgba(47,139,255,0.5)] sm:p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Es. «Mitocondri e fosforilazione ossidativa», «equazione di Bernoulli»…"
              className="h-13 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-12 pr-10 text-[15px] text-fg placeholder:text-fg-subtle focus:border-azure-400/60 focus:outline-none"
              aria-label="Cerca risorse"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); setSubmitted(""); setLive(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-fg-subtle hover:text-fg" aria-label="Cancella ricerca">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" variant="primary" size="lg" className="md:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Cerca
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
          <span className="text-[12px] text-fg-subtle">Lingue:</span>
          {LANGS.map((l) => {
            const on = langs.includes(l.id);
            return (
              <button
                type="button"
                key={l.id}
                onClick={() => setLangs(on ? langs.filter((x) => x !== l.id) : [...langs, l.id])}
                className={cn("rounded-lg border px-2.5 py-1 font-mono text-[11.5px] transition", on ? "border-azure-400/50 bg-azure-500/15 text-azure-100" : "border-white/10 text-fg-subtle hover:text-fg")}
                aria-pressed={on}
                title={LANG_LABEL[l.id]}
              >
                {l.label}
              </button>
            );
          })}
          <label className={cn("ml-auto flex items-center gap-2 text-[12px]", integrations?.webSearch ? "text-fg-muted" : "text-fg-subtle")}>
            <input type="checkbox" className="h-4 w-4 accent-[#2f8bff]" checked={useWeb} disabled={!integrations?.webSearch} onChange={(e) => setUseWeb(e.target.checked)} />
            Includi fonti accademiche dal web
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 px-1 text-[11.5px]">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5", integrations?.youtube ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.04] text-fg-subtle")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", integrations?.youtube ? "bg-emerald-400" : "bg-fg-subtle")} /> YouTube Data API {integrations?.youtube ? "attiva" : "non configurata"}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5", integrations?.webSearch ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.04] text-fg-subtle")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", integrations?.webSearch ? "bg-emerald-400" : "bg-fg-subtle")} /> Ricerca web accademica {integrations?.webSearch ? "attiva" : "non configurata"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-azure-500/10 px-2 py-0.5 text-azure-200">
            <ShieldCheck className="h-3 w-3" /> Catalogo verificato: {RESOURCES.filter((r) => r.access === "free").length} risorse gratuite
          </span>
        </div>
      </form>

      {integrations && !liveAvailable && submitted && (
        <Notice tone="info" className="mt-4" title="Ricerca live non configurata su questo server">
          Mostro i risultati del catalogo verificato. Per cercare in tempo reale su YouTube imposta <code>YOUTUBE_API_KEY</code>; per la ricerca web accademica imposta <code>ANTHROPIC_API_KEY</code>. Nessun risultato viene simulato.
        </Notice>
      )}
      {error && <Notice tone="warning" className="mt-4">{error}</Notice>}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented
          value={subject}
          onChange={setSubject}
          options={[{ value: "tutte" as const, label: "Tutte" }, ...SUBJECTS.map((s) => ({ value: s.id, label: s.id === "chimica" ? "Chimica" : s.name }))]}
        />
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "tutti", label: "Tutto" },
            { value: "corso", label: "Corsi" },
            { value: "videolezione", label: "Video" },
            { value: "libro", label: "Manuali" },
            { value: "piattaforma", label: "Piattaforme" },
          ]}
        />
        <Select value={level} onChange={(e) => setLevel(e.target.value as typeof level)} className="h-9 w-auto text-[13px]" aria-label="Livello">
          <option value="tutti">Ogni livello</option>
          <option value="introduttivo">Introduttivo</option>
          <option value="universitario">Universitario</option>
          <option value="avanzato">Avanzato</option>
        </Select>
        <button onClick={() => setOnlyFav((v) => !v)} className={cn("flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] transition", onlyFav ? "border-rose-400/40 bg-rose-500/10 text-rose-200" : "border-white/10 text-fg-subtle hover:text-fg")} aria-pressed={onlyFav}>
          <Heart className={cn("h-4 w-4", onlyFav && "fill-current")} /> Preferiti {hydrated && favorites.length ? `(${favorites.length})` : ""}
        </button>
      </div>

      {/* Live results */}
      {live && (liveItems.length > 0 || live.youtube.status === "error" || live.web.status === "error") && (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold text-fg">Risultati live per «{live.query}»</h2>
            {live.youtube.status === "ok" && <Badge tone="azure"><MonitorPlay className="h-3 w-3" /> YouTube Data API{live.youtube.cached ? " · cache" : ""}</Badge>}
            {live.web.items.length > 0 && <Badge tone="azure"><Sparkles className="h-3 w-3" /> Ricerca web accademica</Badge>}
          </div>
          {live.youtube.status === "error" && <Notice tone="warning" className="mb-4">YouTube: {live.youtube.message}</Notice>}
          {live.web.status === "error" && <Notice tone="warning" className="mb-4">Ricerca web: {live.web.message}</Notice>}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {liveItems.map((r) => <ResourceCard key={r.id} r={r} />)}
          </div>
          <p className="mt-3 text-[11.5px] text-fg-subtle">
            Titoli in italiano tradotti automaticamente quando l’AI è configurata; il titolo originale resta sempre visibile. La presenza di sottotitoli è indicata solo se dichiarata dall’API di YouTube.
          </p>
        </section>
      )}

      {/* Featured carousel */}
      {!submitted && featured.length > 0 && featuredRef && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-[11.5px] uppercase tracking-[0.16em] text-fg-subtle">In evidenza per il tuo prossimo argomento</div>
              <h2 className="mt-1 font-display text-3xl text-fg">{featuredRef.topic.title}</h2>
            </div>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
            {featured.map((r) => (
              <div key={r.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] xl:w-[31%]">
                <ResourceCard r={r} featured />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalog */}
      {groups
        .filter((g) => (kind === "tutti" || g.id === kind) && g.items.length)
        .map((g) => (
          <section key={g.id} className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-azure-500/10 text-azure-300">{g.icon}</span>
              <h2 className="text-[17px] font-semibold text-fg">{g.title}</h2>
              <span className="font-mono text-[12px] text-fg-subtle">{g.items.length}</span>
              <Badge tone="azure" className="ml-1">FREE</Badge>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {g.items.map((r) => <ResourceCard key={r.id} r={r} />)}
            </div>
          </section>
        ))}

      {catalog.length === 0 && !liveItems.length && (
        <div className="mt-12 rounded-3xl border border-dashed border-white/10 p-10 text-center">
          <div className="text-[15px] text-fg">Nessuna risorsa gratuita corrisponde ai filtri.</div>
          <p className="mt-1 text-[13px] text-fg-subtle">Prova a rimuovere qualche filtro o ad aggiungere lingue. Le risorse premium sono nel pannello dorato in basso a destra.</p>
        </div>
      )}

      <section className="mt-14 overflow-hidden rounded-3xl border border-gold-400/25 bg-[radial-gradient(800px_200px_at_80%_0%,rgba(226,170,47,0.12),transparent)] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold-300/40 bg-gold-500/10 text-gold-300"><Crown className="h-5 w-5" /></span>
            <div>
              <div className="text-[15px] font-semibold text-gradient-gold">Cerchi corsi strutturati a pagamento?</div>
              <div className="text-[13px] text-fg-subtle">Abbonamenti, manuali e corsi di preparazione, con prezzi verificati quando disponibili. Apri il pannello con il pulsante dorato <span className="font-display text-gold-300">$</span>.</div>
            </div>
          </div>
        </div>
      </section>

      <PremiumFab />
    </div>
  );
}
