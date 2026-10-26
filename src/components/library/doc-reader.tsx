"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  ALargeSmall, ArrowLeft, Bookmark, BookmarkCheck, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, FileAudio, Maximize2, Minimize2, Minus, Moon, PanelRight, Pencil, Plus, Search, Sparkles, X,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { SUBJECTS } from "@/data/syllabus";
import { Badge, Button, buttonClasses, Card, EmptyState, Input, Label, Meridian, Modal, Notice, Segmented, Sheet, Skeleton, Switch, Textarea } from "@/components/ui/primitives";
import { SUBJECT_TONE } from "@/components/ui/tone";
import { toast } from "@/components/ui/toast";
import { useAtlas, type LibraryDoc } from "@/lib/store";
import { useFocusMode, useHydrated, useReducedMotion } from "@/lib/hooks";
import { useUI } from "@/lib/ui-store";
import {
  getDocFile, getDocMeta, getPageTexts, looksScanned, openPdf, patchDocMeta, reindexPdf, savePageTexts, splitTextIntoPages, TEXT_VERSION,
  type DocMeta, type HighlightColor, type PageText,
} from "@/lib/library";
import { cn, pluralize, uid } from "@/lib/utils";
import { countLoose, fold, foldWithMap, foldedToSource, inlineMd, legacyAnchor, locateAnchor, looksLikeMarkdown, markdownBlocks, squash } from "./doc-text";
import { DocDetailsModal } from "./doc-details-modal";
import { anchorFor, canPaint, clearPaint, HIGHLIGHT_CSS, indexText, paint, paintMarks, rangeForAnchor, searchRanges, selectionToSource } from "./marks";
import { PdfPage } from "./pdf-page";
import { PANEL_TABS, ReaderPanel, type OutlineItem, type PanelTab, type SearchState } from "./reader-panel";
import { SelectionPopover } from "./selection-popover";
import { DOC_TYPE, displayColor, docType, guessCategory, HL, HL_COLORS, isMarkdownDoc, toStoredColor, useLocalPref, useMediaQuery } from "./shared";
import { TextView, type TextSource } from "./text-view";

type View = "pagina" | "testo";
const VIEW_PREFS = ["auto", "pagina", "testo"] as const;
/** Page zoom: 1 fits the page to the width of the column. */
const ZOOMS = [0.6, 0.75, 0.9, 1, 1.25, 1.5, 2, 2.5];
/** Text sizes of the "Testo" view, in px (17 is the reading size of the app). */
const SIZES = [15, 16, 17, 18, 20, 22, 24];
const TOP_BAR = 56;

async function flattenOutline(doc: PDFDocumentProxy): Promise<OutlineItem[]> {
  const outline = await doc.getOutline();
  if (!outline) return [];
  const out: OutlineItem[] = [];
  const walk = async (items: typeof outline, depth: number) => {
    for (const it of items) {
      let page: number | null = null;
      try {
        const dest = typeof it.dest === "string" ? await doc.getDestination(it.dest) : it.dest;
        const ref = dest?.[0];
        if (typeof ref === "number") page = ref + 1;
        else if (ref && typeof ref === "object") page = (await doc.getPageIndex(ref)) + 1;
      } catch {
        page = null;
      }
      out.push({ title: it.title, page, depth });
      if (it.items?.length && depth < 2) await walk(it.items, depth + 1);
    }
  };
  await walk(outline, 0);
  return out;
}

function subjectName(id?: LibraryDoc["subject"]) {
  return SUBJECTS.find((s) => s.id === id)?.name;
}

export function DocReader({ docId, initialPage, initialQuery }: { docId: string; initialPage?: number; initialQuery?: string }) {
  const hydrated = useHydrated();
  const doc = useAtlas((s) => s.library.find((d) => d.id === docId));
  const updateDoc = useAtlas((s) => s.updateDoc);
  const openProfessor = useUI((s) => s.openProfessor);
  const reduced = useReducedMotion();
  const phone = useMediaQuery("(max-width: 639px)");
  const wide = useMediaQuery("(min-width: 1280px)");
  const coarse = useMediaQuery("(pointer: coarse)");
  const belowLg = useMediaQuery("(max-width: 1023px)");

  // ── Data ────────────────────────────────────────────────────
  const [blob, setBlob] = useState<Blob | null | undefined>(undefined);
  const [texts, setTexts] = useState<PageText[] | null>(null);
  const [meta, setMeta] = useState<DocMeta>({});
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [pdfOutline, setPdfOutline] = useState<OutlineItem[]>([]);
  const [reindexing, setReindexing] = useState(false);

  // ── Reading state and preferences ───────────────────────────
  const [page, setPage] = useState(initialPage ?? 1);
  const [viewPref, setViewPref, viewLoaded] = useLocalPref<(typeof VIEW_PREFS)[number]>("atlas-reader-view", "auto", VIEW_PREFS);
  const [nightPref, setNightPref] = useLocalPref<"on" | "off">("atlas-reader-night", "off", ["on", "off"]);
  const [sizePref, setSizePref] = useLocalPref<string>("atlas-reader-size", "17");
  const [asidePref, setAsidePref] = useLocalPref<"open" | "closed">("atlas-reader-aside", "open", ["open", "closed"]);
  const [tab, setTab] = useLocalPref<PanelTab>("atlas-reader-tab", "indice", PANEL_TABS);
  const [zoom, setZoom] = useState(1);
  const [immersive, setImmersive] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewSheet, setViewSheet] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [toolbarH, setToolbarH] = useState(52);

  // ── Search ──────────────────────────────────────────────────
  const [findOpen, setFindOpen] = useState(!!initialQuery);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [dq, setDq] = useState(initialQuery ?? "");
  const [cursor, setCursor] = useState<{ page: number; i: number } | null>(null);

  // ── Surface, selection, annotations ─────────────────────────
  const [surfaceV, setSurfaceV] = useState(0);
  const [sel, setSel] = useState<{ range: Range; rect: DOMRect } | null>(null);
  const [cardDraft, setCardDraft] = useState<{ text: string; page: number } | null>(null);
  const [undo, setUndo] = useState<{ label: string; restore: () => void } | null>(null);
  const [announce, setAnnounce] = useState("");

  const pageRef = useRef(page);
  pageRef.current = page;
  const immersiveRef = useRef(immersive);
  immersiveRef.current = immersive;
  const surfaceRef = useRef<HTMLElement | null>(null);
  const selRef = useRef(sel);
  selRef.current = sel;
  const readerTopRef = useRef<HTMLElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const zoomBoxRef = useRef<HTMLDivElement>(null);
  const findInlineRef = useRef<HTMLInputElement>(null);
  const findRowRef = useRef<HTMLInputElement>(null);
  const findBtnRef = useRef<HTMLButtonElement>(null);
  const revealSearch = useRef(false);
  const revealMark = useRef<string | null>(null);
  const popoverDown = useRef(false);
  const restored = useRef(false);
  const reindexRan = useRef(false);

  useFocusMode(immersive);

  const latest = useCallback(() => useAtlas.getState().library.find((d) => d.id === docId), [docId]);

  // Load the file, the extracted text and the reading metadata from this browser.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [b, t, m] = await Promise.all([getDocFile(docId).catch(() => undefined), getPageTexts(docId).catch(() => [] as PageText[]), getDocMeta(docId)]);
      if (cancelled) return;
      setBlob(b ?? null);
      setTexts(t);
      setMeta((cur) => ({ ...m, ...cur, marks: { ...m.marks, ...cur.marks } }));
      setMetaLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const exists = hydrated && !!doc;

  // Restore the page (link with ?p= or the last page read) and record the visit.
  useEffect(() => {
    if (!exists || restored.current) return;
    restored.current = true;
    const d = latest()!;
    const want = initialPage && initialPage > 0 ? initialPage : (d.lastPage ?? 1);
    const p = Math.max(1, d.pages ? Math.min(want, d.pages) : want);
    setPage(p);
    if (d.lastPage !== p) updateDoc(d.id, { lastPage: p });
    patchDocMeta(d.id, (m) => ({ ...m, lastOpenedAt: new Date().toISOString() }))
      .then((m) => setMeta((cur) => ({ ...cur, lastOpenedAt: m.lastOpenedAt })))
      .catch(() => undefined);
    if (initialQuery) setTab("cerca");
  }, [exists, initialPage, initialQuery, latest, updateDoc, setTab]);

  // Documents indexed with an older extraction (or interrupted while uploading) are read again.
  useEffect(() => {
    if (!exists || reindexRan.current || !metaLoaded || blob === undefined || texts === null || !blob) return;
    const d = latest()!;
    const pdfStale = d.kind === "pdf" && ((meta.textVersion ?? 1) < TEXT_VERSION || !texts.length || d.pages === undefined);
    const textMissing = d.kind === "testo" && (!texts.length || d.pages === undefined);
    if (!pdfStale && !textMissing) return;
    reindexRan.current = true;
    setReindexing(true);
    (async () => {
      try {
        let pages: PageText[];
        if (d.kind === "pdf") pages = (await reindexPdf(d.id)) ?? [];
        else {
          pages = splitTextIntoPages(await blob.text());
          await savePageTexts(d.id, pages);
          await patchDocMeta(d.id, (m) => ({ ...m, textVersion: TEXT_VERSION, category: m.category ?? guessCategory(d.name) }));
        }
        setTexts(pages);
        setMeta((m) => ({ ...m, textVersion: TEXT_VERSION }));
        updateDoc(d.id, { pages: pages.length || d.pages, textIndexed: d.kind === "pdf" ? !looksScanned(pages) : pages.length > 0 });
      } catch {
        toast("Testo del documento non aggiornato", { tone: "warning", description: "Puoi comunque sfogliare le pagine. Riprova riaprendo il documento." });
      } finally {
        setReindexing(false);
      }
    })();
  }, [exists, metaLoaded, blob, texts, meta.textVersion, latest, updateDoc]);

  // Open the PDF once the file is loaded.
  const kind = doc?.kind;
  useEffect(() => {
    if (!blob || kind !== "pdf") return;
    let handle: Awaited<ReturnType<typeof openPdf>> | null = null;
    let cancelled = false;
    (async () => {
      try {
        handle = await openPdf(await blob.arrayBuffer());
        if (cancelled) return handle.close();
        setPdf(handle.doc);
        setPdfOutline(await flattenOutline(handle.doc).catch(() => []));
      } catch {
        if (!cancelled) setPdfError(true);
      }
    })();
    return () => {
      cancelled = true;
      setPdf(null);
      handle?.close();
    };
  }, [blob, kind]);

  // Audio: an object URL for the player.
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob || kind !== "audio") return;
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob, kind]);

  // ── Derived ─────────────────────────────────────────────────
  const numPages = Math.max(1, doc?.pages ?? pdf?.numPages ?? (texts?.length || 1));
  const hasText = !!texts?.some((t) => t.text.trim());
  const canPage = kind === "pdf" && !!blob && !pdfError;
  const view: View = kind !== "pdf" || !canPage ? "testo" : !hasText ? "pagina" : viewPref === "auto" ? (phone ? "testo" : "pagina") : viewPref;
  const night = nightPref === "on" && view === "pagina";
  const size = SIZES.includes(Number(sizePref)) ? Number(sizePref) : 17;
  const source: TextSource = kind === "pdf" ? "pdf" : doc && (isMarkdownDoc(doc) || (texts?.[0] && looksLikeMarkdown(texts[0].text))) ? "markdown" : "plain";
  const pageText = texts?.find((t) => t.page === page);
  const showAside = wide && asidePref === "open";
  const stickyTop = immersive ? 0 : TOP_BAR;
  /** Height kept free at the bottom of the screen: the mobile tab bar, when it is shown. */
  const bottomInset = belowLg && !immersive ? 80 : 12;

  const outline = useMemo((): { items: OutlineItem[]; kind: "pdf" | "detected" | "markdown" | null } => {
    if (pdfOutline.length) return { items: pdfOutline, kind: "pdf" };
    if (!texts) return { items: [], kind: null };
    if (kind === "pdf") {
      // Running headers repeat on many pages: keep headings that appear at most twice.
      const seen = new Map<string, number>();
      for (const t of texts) for (const h of t.headings ?? []) seen.set(h, (seen.get(h) ?? 0) + 1);
      const items = texts.flatMap((t) => (t.headings ?? []).filter((h) => (seen.get(h) ?? 0) <= 2).slice(0, 4).map((h) => ({ title: h, page: t.page, depth: 0 })));
      return { items: items.slice(0, 400), kind: items.length ? "detected" : null };
    }
    if (source === "markdown") {
      const items = texts.flatMap((t) =>
        markdownBlocks(t.text)
          .filter((b): b is Extract<typeof b, { type: "h" }> => b.type === "h")
          .map((b) => ({ title: inlineMd(b.text).text, page: t.page, depth: b.level - 1 })),
      );
      return { items: items.slice(0, 400), kind: items.length ? "markdown" : null };
    }
    return { items: [], kind: null };
  }, [pdfOutline, texts, kind, source]);

  // ── Navigation ──────────────────────────────────────────────
  const stickyOffset = useCallback(() => (immersiveRef.current ? 0 : TOP_BAR) + (toolbarRef.current?.offsetHeight ?? 52), []);

  const scrollToReader = useCallback(() => {
    requestAnimationFrame(() => {
      const el = readerTopRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset() - 12;
      if (window.scrollY > top + 1) window.scrollTo({ top, behavior: "auto" });
      zoomBoxRef.current?.scrollTo({ top: 0 });
    });
  }, [stickyOffset]);

  const go = useCallback(
    (p: number, opts?: { keepScroll?: boolean }) => {
      const n = Math.max(1, Math.min(numPages, Math.round(p) || 1));
      setSel(null);
      if (n !== pageRef.current) {
        pageRef.current = n;
        setPage(n);
        updateDoc(docId, { lastPage: n });
      }
      if (!opts?.keepScroll) scrollToReader();
    },
    [numPages, docId, updateDoc, scrollToReader],
  );

  // Toolbar height (it grows when the search row is open) for the sticky panel and the zoom box.
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setToolbarH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [exists, kind, blob, texts === null]);

  // ── Search ──────────────────────────────────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => setDq(query), 220);
    return () => window.clearTimeout(t);
  }, [query]);

  const sq = useMemo(() => squash(fold(dq)).text, [dq]);
  const searchActive = sq.length >= 2 && hasText;
  const hits = useMemo(
    () => (searchActive && texts ? texts.map((t) => ({ page: t.page, count: countLoose(t.text, dq) })).filter((h) => h.count > 0) : []),
    [searchActive, texts, dq],
  );
  const total = hits.reduce((a, h) => a + h.count, 0);

  // A new query jumps to the first match on or after the current page.
  useEffect(() => {
    if (!hits.length) {
      setCursor(null);
      return;
    }
    const cur = pageRef.current;
    const h = hits.find((x) => x.page >= cur) ?? hits[0];
    setCursor({ page: h.page, i: 0 });
    revealSearch.current = true;
    if (h.page !== cur) go(h.page, { keepScroll: true });
  }, [hits, go]);

  const step = (dir: 1 | -1) => {
    if (!hits.length) return;
    const c = cursor;
    const idx = c ? hits.findIndex((h) => h.page === c.page) : -1;
    let next: { page: number; i: number };
    if (!c || idx < 0) {
      const h = dir === 1 ? (hits.find((x) => x.page > page) ?? hits[0]) : ([...hits].reverse().find((x) => x.page < page) ?? hits[hits.length - 1]);
      next = { page: h.page, i: dir === 1 ? 0 : h.count - 1 };
    } else {
      const ni = c.i + dir;
      if (ni >= 0 && ni < hits[idx].count) next = { page: c.page, i: ni };
      else {
        const h = hits[(idx + dir + hits.length) % hits.length];
        next = { page: h.page, i: dir === 1 ? 0 : h.count - 1 };
      }
    }
    setCursor(next);
    revealSearch.current = true;
    if (next.page !== page) go(next.page, { keepScroll: true });
  };

  const ordinal = cursor ? hits.filter((h) => h.page < cursor.page).reduce((a, h) => a + h.count, 0) + cursor.i + 1 : 0;

  const pickResult = (p: number) => {
    setCursor({ page: p, i: 0 });
    revealSearch.current = true;
    if (!wide) setSheetOpen(false);
    go(p, { keepScroll: true });
    if (p === page) setSurfaceV((v) => v + 1);
  };

  const openFind = useCallback(() => {
    if (wide) {
      findInlineRef.current?.focus();
      findInlineRef.current?.select();
    } else {
      setFindOpen(true);
      window.setTimeout(() => {
        findRowRef.current?.focus();
        findRowRef.current?.select();
      }, 30);
    }
  }, [wide]);

  const closeFind = () => {
    setQuery("");
    setDq("");
    setFindOpen(false);
    window.setTimeout(() => findBtnRef.current?.focus(), 30);
  };

  const searchState: SearchState = {
    query,
    setQuery,
    hits,
    total,
    short: sq.length > 0 && sq.length < 2,
    pending: query !== dq,
    current: cursor,
    onPick: pickResult,
  };

  // ── Painting highlights and matches on the surface ──────────
  const onSurface = useCallback((el: HTMLElement | null) => {
    surfaceRef.current = el;
    setSurfaceV((v) => v + 1);
  }, []);

  const reveal = useCallback(
    (r: Range) => {
      const node = r.startContainer.parentElement;
      const zb = zoomBoxRef.current;
      if (zb && node && zb.contains(node) && (zb.scrollWidth > zb.clientWidth || zb.scrollHeight > zb.clientHeight)) node.scrollIntoView({ block: "center", inline: "center" });
      const rect = r.getBoundingClientRect();
      const topSafe = stickyOffset() + 16;
      const bottomSafe = window.innerHeight - bottomInset - 16;
      if (rect.top < topSafe || rect.bottom > bottomSafe) {
        window.scrollTo({ top: window.scrollY + rect.top - topSafe - (bottomSafe - topSafe) / 3, behavior: reduced ? "auto" : "smooth" });
      }
    },
    [stickyOffset, bottomInset, reduced],
  );

  const highlightsKey = doc ? doc.highlights.map((h) => `${h.id}:${h.page}:${h.color}`).join("|") : "";
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || !doc) {
      clearPaint();
      return;
    }
    const index = indexText(el);
    const marks = doc.highlights
      .filter((h) => h.page === page)
      .map((h) => ({ id: h.id, color: displayColor(h, meta), range: rangeForAnchor(index, meta.marks?.[h.id]?.anchor ?? legacyAnchor(h.text)) }))
      .filter((m): m is { id: string; color: HighlightColor; range: Range } => !!m.range);
    paintMarks(marks);
    if (revealMark.current) {
      const m = marks.find((x) => x.id === revealMark.current);
      if (m) {
        reveal(m.range);
        revealMark.current = null;
      }
    }
    if (searchActive) {
      const rs = searchRanges(index, dq);
      const ci = cursor && cursor.page === page && rs.length ? Math.min(cursor.i, rs.length - 1) : -1;
      paint("atlas-search", rs.filter((_, i) => i !== ci), 2);
      paint("atlas-search-current", ci >= 0 ? [rs[ci]] : [], 3);
      if (revealSearch.current && ci >= 0) {
        revealSearch.current = false;
        reveal(rs[ci]);
      }
    } else {
      paint("atlas-search", []);
      paint("atlas-search-current", []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaceV, highlightsKey, meta, page, searchActive, dq, cursor, reveal]);

  useEffect(() => () => clearPaint(), []);

  // ── Selection ───────────────────────────────────────────────
  useEffect(() => {
    let timer = 0;
    const onSel = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const s = window.getSelection();
        const el = surfaceRef.current;
        if (!s || s.isCollapsed || !s.rangeCount || !el) {
          if (!popoverDown.current) setSel(null);
          return;
        }
        const r = s.getRangeAt(0);
        if (!el.contains(r.startContainer) && !el.contains(r.endContainer)) {
          setSel(null);
          return;
        }
        if (r.toString().replace(/\s+/g, "").length < 2) {
          setSel(null);
          return;
        }
        setSel({ range: r.cloneRange(), rect: r.getBoundingClientRect() });
      }, 140);
    };
    const onUp = () => window.setTimeout(() => (popoverDown.current = false), 400);
    document.addEventListener("selectionchange", onSel);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", onSel);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // Keep the selection toolbar next to the passage while scrolling.
  const hasSel = !!sel;
  useEffect(() => {
    if (!hasSel) return;
    let frame = 0;
    const upd = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSel((s) => (s ? { range: s.range, rect: s.range.getBoundingClientRect() } : s)));
    };
    window.addEventListener("scroll", upd, { passive: true, capture: true });
    window.addEventListener("resize", upd);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", upd, { capture: true });
      window.removeEventListener("resize", upd);
    };
  }, [hasSel]);

  const focusReader = () => window.setTimeout(() => readerTopRef.current?.focus({ preventScroll: true }), 40);

  /** The selected passage, with the spacing of the extracted text when it can be found there. */
  const passageOf = (s: { range: Range }) => {
    const el = surfaceRef.current;
    if (!el) return null;
    const index = indexText(el);
    const src = selectionToSource(index, s.range);
    if (!src) return null;
    const anchor = anchorFor(index, src[0], src[1]);
    let text = s.range.toString().replace(/\s+/g, " ").trim();
    const pt = texts?.find((t) => t.page === pageRef.current)?.text;
    if (pt && anchor) {
      const f = foldWithMap(pt);
      const hit = locateAnchor(f.text, anchor);
      if (hit) {
        const [a, b] = foldedToSource(f, pt, hit[0], hit[1]);
        const clean = pt.slice(a, b).replace(/\s+/g, " ").trim();
        if (clean) text = clean;
      }
    }
    return { text: text.slice(0, 800), anchor };
  };

  const highlight = useCallback(
    (c: HighlightColor) => {
      const s = selRef.current;
      const d = latest();
      if (!s || !d) return;
      const passage = passageOf(s);
      if (!passage) return;
      const id = uid("hl");
      const p = pageRef.current;
      updateDoc(d.id, { highlights: [...d.highlights, { id, page: p, text: passage.text, color: toStoredColor(c), createdAt: new Date().toISOString() }] });
      const mark = { color: c, anchor: passage.anchor ?? undefined };
      setMeta((m) => ({ ...m, marks: { ...m.marks, [id]: mark } }));
      patchDocMeta(d.id, (m) => ({ ...m, marks: { ...m.marks, [id]: mark } })).catch(() => undefined);
      window.getSelection()?.removeAllRanges();
      setSel(null);
      setAnnounce(`Passaggio evidenziato in ${HL[c].label}.`);
      focusReader();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latest, updateDoc, texts],
  );

  const explain = () => {
    const s = selRef.current;
    const d = latest();
    if (!s || !d) return;
    const passage = passageOf(s);
    window.getSelection()?.removeAllRanges();
    setSel(null);
    openProfessor({ docId: d.id, prompt: `Spiegami questo passaggio di «${d.name}» (p. ${pageRef.current}): «${passage?.text ?? s.range.toString().trim()}»` });
  };

  const makeCard = () => {
    const s = selRef.current;
    if (!s) return;
    const passage = passageOf(s);
    window.getSelection()?.removeAllRanges();
    setSel(null);
    setCardDraft({ text: passage?.text ?? s.range.toString().trim(), page: pageRef.current });
  };

  // ── Annotations ─────────────────────────────────────────────
  const toggleBookmark = (p: number) => {
    const d = latest();
    if (!d) return;
    const has = d.bookmarks.includes(p);
    updateDoc(d.id, { bookmarks: has ? d.bookmarks.filter((b) => b !== p) : [...d.bookmarks, p].sort((a, b) => a - b) });
    setAnnounce(has ? `Segnalibro tolto da pagina ${p}.` : `Segnalibro aggiunto a pagina ${p}.`);
  };

  const saveNote = (id: string, note: string) => {
    const d = latest();
    if (!d) return;
    updateDoc(d.id, { highlights: d.highlights.map((h) => (h.id === id ? { ...h, note: note.trim() || undefined } : h)) });
    toast(note.trim() ? "Nota salvata" : "Nota tolta");
  };

  const deleteHighlight = (id: string) => {
    const d = latest();
    const h = d?.highlights.find((x) => x.id === id);
    if (!d || !h) return;
    const mark = meta.marks?.[id];
    updateDoc(d.id, { highlights: d.highlights.filter((x) => x.id !== id) });
    const drop = (m: DocMeta) => {
      const marks = { ...m.marks };
      delete marks[id];
      return { ...m, marks };
    };
    setMeta(drop);
    patchDocMeta(d.id, drop).catch(() => undefined);
    setUndo({
      label: "Evidenziazione eliminata.",
      restore: () => {
        const d2 = latest();
        if (!d2) return;
        updateDoc(d2.id, { highlights: [...d2.highlights, h] });
        if (mark) {
          setMeta((m) => ({ ...m, marks: { ...m.marks, [id]: mark } }));
          patchDocMeta(d2.id, (m) => ({ ...m, marks: { ...m.marks, [id]: mark } })).catch(() => undefined);
        }
      },
    });
  };

  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 10_000);
    return () => window.clearTimeout(t);
  }, [undo]);

  const panelGo = (p: number, markId?: string) => {
    if (!wide) setSheetOpen(false);
    revealMark.current = markId ?? null;
    go(p, { keepScroll: !!markId });
    if (markId && p === page) setSurfaceV((v) => v + 1);
  };

  // ── Keyboard ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      const typing = !!t?.closest('input, textarea, select, [contenteditable="true"]');
      const plain = !e.altKey && !e.metaKey && !e.ctrlKey;
      if (e.key === "/" && !typing && plain) {
        e.preventDefault();
        openFind();
        return;
      }
      if (typing || !plain || e.shiftKey) return;
      if (selRef.current && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        highlight(HL_COLORS[Number(e.key) - 1]);
        return;
      }
      if (e.key === "Escape" && immersiveRef.current) {
        setImmersive(false);
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (t?.closest('[role="radiogroup"], [role="tablist"], [role="slider"], [data-own-arrows], audio, video')) return;
      const s = window.getSelection();
      if (s && !s.isCollapsed) return;
      const zb = zoomBoxRef.current;
      if (zb && zb.scrollWidth > zb.clientWidth + 1) return;
      e.preventDefault();
      go(pageRef.current + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, highlight, openFind]);

  // ── Render ──────────────────────────────────────────────────
  if (!hydrated) return <ReaderSkeleton />;
  if (!doc) {
    return (
      <EmptyState
        className="mt-10"
        title="Documento non trovato"
        description="Potrebbe essere stato eliminato o caricato su un altro dispositivo: i file della biblioteca restano nel browser in cui li hai caricati."
        action={<Button variant="secondary" href="/biblioteca">Torna alla biblioteca</Button>}
      />
    );
  }

  const t = docType(doc, meta);
  const TypeIcon = DOC_TYPE[t].icon;
  const bookmarked = doc.bookmarks.includes(page);
  const loading = blob === undefined || texts === null || !viewLoaded;
  const fileMissing = blob === null;
  const zoomIdx = ZOOMS.indexOf(zoom);
  const sizeIdx = SIZES.indexOf(size);
  const isPdfWithText = kind === "pdf" && canPage && hasText;
  const paintMissing = !canPaint() && (doc.highlights.some((h) => h.page === page) || searchActive);

  const header = (
    <header className={cn("flex flex-col gap-3", immersive && "gap-2")}>
      <div className="-ml-2 flex items-center justify-between gap-2">
        <Link href="/biblioteca" className={buttonClasses("ghost", "sm", "px-2")}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Biblioteca
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailsOpen(true)} aria-label="Modifica nome, materia e fonte" title="Modifica nome, materia e fonte">
            <Pencil className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Dettagli</span>
          </Button>
          {doc.kind !== "audio" && (
            <Button variant="ghost" size="sm" onClick={() => openProfessor({ docId: doc.id })}>
              <span className="inline-flex items-center gap-1.5 text-azure-200">
                <Sparkles className="h-4 w-4" aria-hidden /> <span className="sm:hidden">Professor</span>
                <span className="hidden sm:inline">Chiedi al Professor</span>
              </span>
            </Button>
          )}
        </div>
      </div>
      <h1 className={cn("font-display leading-[1.15] tracking-[-0.01em] text-fg [overflow-wrap:anywhere] [text-wrap:balance]", immersive ? "line-clamp-1 text-xl" : "line-clamp-2 text-2xl sm:text-3xl")} title={doc.name}>
        {doc.name}
      </h1>
      {!immersive && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <TypeIcon className="h-4 w-4 text-fg-subtle" aria-hidden />
            {DOC_TYPE[t].label}
            {doc.kind !== "audio" && doc.pages ? `, ${pluralize(doc.pages, "pagina", "pagine")}` : ""}
          </span>
          {doc.subject && <Badge tone={SUBJECT_TONE[doc.subject]} dot>{subjectName(doc.subject)}</Badge>}
          {doc.sourceUrl && (
            <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg text-azure-300 hover:text-azure-200 hover:underline">
              Fonte originale <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(si apre in una nuova scheda)</span>
            </a>
          )}
        </div>
      )}
    </header>
  );

  const details = (
    <DocDetailsModal doc={detailsOpen ? doc : null} meta={meta} open={detailsOpen} onClose={() => setDetailsOpen(false)} onMeta={(_, m) => setMeta(m)} />
  );

  // Audio: player only (no text to read, search or analyse).
  if (doc.kind === "audio" || doc.kind === "altro") {
    return (
      <div className="pb-16">
        {header}
        <Card className="mt-6 max-w-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 text-sm text-fg-muted">
            <FileAudio className="h-5 w-5 text-fg-subtle" aria-hidden /> Registrazione
          </div>
          {fileMissing ? (
            <Notice tone="warning" className="mt-4">Il file non è presente in questo browser: è stato caricato su un altro dispositivo o i dati del sito sono stati cancellati.</Notice>
          ) : audioUrl ? (
            <audio controls src={audioUrl} className="mt-4 w-full" />
          ) : (
            <Skeleton className="mt-4 h-12 w-full" />
          )}
          <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-fg-muted">
            La trascrizione automatica non è disponibile in questa versione: l’audio si ascolta, ma non si può cercare né analizzare con l’AI.
          </p>
        </Card>
        {details}
      </div>
    );
  }

  const zoomControls =
    view === "pagina" ? (
      <ZoomGroup
        label={`${Math.round(zoom * 100)}%`}
        resetLabel="Adatta alla larghezza"
        decLabel="Riduci lo zoom"
        incLabel="Aumenta lo zoom"
        onDec={() => setZoom(ZOOMS[Math.max(0, zoomIdx - 1)])}
        onInc={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, zoomIdx + 1)])}
        onReset={() => setZoom(1)}
        canDec={zoomIdx > 0}
        canInc={zoomIdx < ZOOMS.length - 1}
      />
    ) : (
      <ZoomGroup
        label={`${size} px`}
        resetLabel="Dimensione normale del testo"
        decLabel="Testo più piccolo"
        incLabel="Testo più grande"
        onDec={() => setSizePref(String(SIZES[Math.max(0, sizeIdx - 1)]))}
        onInc={() => setSizePref(String(SIZES[Math.min(SIZES.length - 1, sizeIdx + 1)]))}
        onReset={() => setSizePref("17")}
        canDec={sizeIdx > 0}
        canInc={sizeIdx < SIZES.length - 1}
      />
    );

  const findProps = {
    query,
    setQuery,
    disabled: !hasText,
    counter: !query.trim() ? "" : searchState.short ? "2+ lettere" : searchState.pending ? "…" : total ? `${ordinal || 1} di ${total}` : "Nessuna",
    total,
    onNext: () => step(1),
    onPrev: () => step(-1),
  };

  const onToolsClick = () => {
    if (wide) setAsidePref(asidePref === "open" ? "closed" : "open");
    else setSheetOpen(true);
  };

  const panel = (cls?: string) => (
    <ReaderPanel
      doc={doc}
      meta={meta}
      page={page}
      numPages={numPages}
      texts={texts ?? []}
      outline={outline.items}
      outlineKind={outline.kind}
      tab={tab}
      setTab={setTab}
      onGo={panelGo}
      search={searchState}
      canSearch={hasText}
      onSaveNote={saveNote}
      onDelete={deleteHighlight}
      undo={undo}
      onUndo={() => {
        undo?.restore();
        setUndo(null);
      }}
      onToggleBookmark={toggleBookmark}
      className={cls}
    />
  );

  const emptyPage = (
    <div className="mx-auto max-w-[60ch] rounded-card border border-dashed border-white/[0.1] px-6 py-10 text-center">
      <p className="text-base font-medium text-fg">Questa pagina non contiene testo</p>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">Può essere un’immagine, una tabella disegnata o una pagina vuota.</p>
      {kind === "pdf" && canPage && (
        <Button variant="secondary" className="mt-5" onClick={() => setViewPref("pagina")}>
          Vedi la pagina originale
        </Button>
      )}
    </div>
  );

  return (
    <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12" data-reader>
      <style>{HIGHLIGHT_CSS}</style>
      {header}

      {/* Toolbar: one row; the luminous line at its foot is the reading progress. */}
      <div
        ref={toolbarRef}
        className={cn("sticky z-30 -mx-4 mt-5 bg-ink-950 sm:-mx-6 lg:-mx-10", immersive ? "top-0 pt-[env(safe-area-inset-top)]" : "top-14")}
      >
        <div role="group" aria-label="Strumenti del lettore" className="flex h-[52px] items-center gap-0.5 px-4 sm:gap-1 sm:px-6 lg:px-10">
          <Button size="icon" variant="ghost" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Pagina precedente">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Button>
          <PageField page={page} numPages={numPages} onGo={go} compact={immersive && phone} />
          <Button size="icon" variant="ghost" onClick={() => go(page + 1)} disabled={page >= numPages} aria-label="Pagina successiva">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Button>

          <div className="hidden items-center gap-1 xl:flex">
            {isPdfWithText && (
              <>
                <Sep />
                <Segmented
                  size="sm"
                  ariaLabel="Vista"
                  value={view}
                  onChange={(v) => setViewPref(v)}
                  options={[
                    { value: "pagina", label: "Pagina" },
                    { value: "testo", label: "Testo" },
                  ]}
                />
              </>
            )}
            <Sep />
            {zoomControls}
            {view === "pagina" && (
              <ToggleIcon pressed={night} onClick={() => setNightPref(night ? "off" : "on")} label="Pagina scura per la sera" icon={<Moon className="h-[18px] w-[18px]" aria-hidden />} />
            )}
          </div>

          {wide ? (
            <FindField inputRef={findInlineRef} className="ml-auto mr-1 min-w-0 max-w-[22rem] flex-1" {...findProps} onEscape={() => setQuery("")} />
          ) : (
            <span className="flex-1" aria-hidden />
          )}
          {!wide && (
            <ToggleIcon
              ref={findBtnRef}
              pressed={findOpen}
              onClick={() => (findOpen ? closeFind() : openFind())}
              label="Cerca nel documento"
              icon={<Search className="h-[18px] w-[18px]" aria-hidden />}
              controls="reader-find-row"
            />
          )}
          <span className="xl:hidden">
            <Button size="icon" variant="ghost" onClick={() => setViewSheet(true)} aria-label="Visualizzazione: vista, dimensione del testo, pagina scura" aria-haspopup="dialog" title="Visualizzazione">
              <ALargeSmall className="h-5 w-5" aria-hidden />
            </Button>
          </span>
          <ToggleIcon
            pressed={bookmarked}
            onClick={() => toggleBookmark(page)}
            label={`Segnalibro su pagina ${page}`}
            icon={bookmarked ? <BookmarkCheck className="h-[18px] w-[18px] fill-azure-400/25 text-azure-300" aria-hidden /> : <Bookmark className="h-[18px] w-[18px]" aria-hidden />}
          />
          <span className={immersive ? "inline-flex" : "hidden md:inline-flex"}>
            <ToggleIcon
              pressed={immersive}
              onClick={() => setImmersive(!immersive)}
              label={immersive ? "Esci dalla lettura immersiva" : "Lettura immersiva: nasconde menu e barre"}
              icon={immersive ? <Minimize2 className="h-[18px] w-[18px]" aria-hidden /> : <Maximize2 className="h-[18px] w-[18px]" aria-hidden />}
            />
          </span>
          <Button
            size="sm"
            variant={showAside ? "ghost" : "secondary"}
            onClick={onToolsClick}
            aria-label="Strumenti: indice, annotazioni, ricerca e AI"
            aria-expanded={wide ? showAside : sheetOpen}
            aria-haspopup={wide ? undefined : "dialog"}
            className={cn("ml-0.5 h-10 w-10 px-0 md:w-auto md:px-3", showAside && "bg-white/[0.07]")}
          >
            <PanelRight className="h-[18px] w-[18px]" aria-hidden />
            <span className="hidden md:inline">Strumenti</span>
          </Button>
        </div>

        {!wide && findOpen && (
          <div id="reader-find-row" className="px-4 pb-2.5 sm:px-6 lg:px-10">
            <FindField inputRef={findRowRef} className="w-full" {...findProps} onEscape={closeFind} onClose={closeFind} />
          </div>
        )}
        <Meridian value={page / numPages} label={`Avanzamento: pagina ${page} di ${numPages}`} />
      </div>

      <div className={cn("mt-6 grid gap-6", showAside && "grid-cols-[minmax(0,1fr)_352px] gap-8")}>
        <div className="min-w-0">
          {reindexing && (
            <Notice tone="info" className="mb-4" live>
              Sto rileggendo il testo del documento per la ricerca e la vista Testo…
            </Notice>
          )}
          {fileMissing && hasText && (
            <Notice tone="warning" className="mb-4">
              Il file originale non è in questo browser: stai leggendo il testo che era stato estratto.
            </Notice>
          )}
          {pdfError && (
            <Notice tone="warning" className="mb-4" live>
              {hasText ? "Questo PDF non si apre nel browser: stai leggendo il testo estratto." : "Questo PDF non si apre nel browser. Il file potrebbe essere danneggiato: prova a ricaricarlo dalla biblioteca."}
            </Notice>
          )}
          {paintMissing && (
            <Notice tone="info" className="mb-4">
              Il tuo browser non colora i passaggi nella pagina: aggiornalo per vedere evidenziazioni e risultati. Li trovi comunque in Strumenti.
            </Notice>
          )}

          <section
            ref={readerTopRef}
            tabIndex={-1}
            aria-label={`Pagina ${page} di ${numPages}`}
            className="rounded-card focus-visible:outline-offset-8"
            style={{ scrollMarginTop: stickyTop + toolbarH + 12 }}
          >
            {loading ? (
              <Skeleton className="mx-auto aspect-[1/1.32] w-full max-w-3xl" />
            ) : fileMissing && !hasText ? (
              <EmptyState
                title="Il file non è in questo browser"
                description="I documenti restano nel browser in cui li hai caricati. Caricalo di nuovo da questo dispositivo per leggerlo qui."
                action={<Button variant="secondary" href="/biblioteca">Torna alla biblioteca</Button>}
              />
            ) : view === "pagina" ? (
              pdf ? (
                <div
                  ref={zoomBoxRef}
                  className={cn(zoom > 1 && "overflow-auto overscroll-contain rounded-card border border-white/[0.07] bg-ink-900 p-2 sm:p-3")}
                  style={zoom > 1 ? { maxHeight: `calc(100dvh - ${stickyTop + toolbarH + bottomInset + 24}px)` } : undefined}
                >
                  <div data-surface={night ? "pdf-night" : "pdf-day"} data-reading-area>
                    <PdfPage pdf={pdf} page={page} zoom={zoom} night={night} onReady={onSurface} />
                  </div>
                </div>
              ) : pdfError ? null : (
                <div className="mx-auto max-w-3xl">
                  <Skeleton className="aspect-[1/1.32] w-full" />
                  <p className="mt-3 text-center text-sm text-fg-muted" role="status">Apertura del PDF…</p>
                </div>
              )
            ) : (
              <div data-surface="text" data-reading-area className="pt-2">
                <TextView key={page} text={pageText?.text ?? ""} source={source} headings={pageText?.headings} size={size} onReady={onSurface} empty={emptyPage} />
              </div>
            )}
          </section>

          {sel && (
            <SelectionPopover
              rect={sel.rect}
              coarse={coarse}
              topInset={stickyTop + toolbarH}
              bottomInset={bottomInset}
              onColor={highlight}
              onExplain={explain}
              onCard={makeCard}
              onPointerDownInside={() => (popoverDown.current = true)}
            />
          )}

          {!loading && !(fileMissing && !hasText) && (
            <nav aria-label="Cambia pagina" className="mx-auto mt-10 flex max-w-[66ch] items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
              <Button
                variant="ghost"
                onClick={() => {
                  go(page - 1);
                  focusReader();
                }}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Precedente
              </Button>
              <span className="text-sm tabular-nums text-fg-subtle">
                {page} di {numPages}
              </span>
              <Button
                variant={page < numPages ? "secondary" : "ghost"}
                onClick={() => {
                  go(page + 1);
                  focusReader();
                }}
                disabled={page >= numPages}
              >
                Successiva <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </nav>
          )}
        </div>

        {showAside && (
          <aside aria-label="Strumenti di lettura" className="min-w-0">
            <div className="card sticky flex flex-col overflow-hidden pt-2" style={{ top: stickyTop + toolbarH + 16, height: `calc(100dvh - ${stickyTop + toolbarH + 32}px)` }}>
              {panel("h-full")}
            </div>
          </aside>
        )}
      </div>

      <Sheet open={!wide && sheetOpen} onClose={() => setSheetOpen(false)} side={phone ? "bottom" : "right"} width="max-w-md" title="Strumenti di lettura">
        <div className={cn("flex flex-col pt-2", phone ? "h-[min(80dvh,760px)]" : "h-full")}>{panel("flex-1")}</div>
      </Sheet>

      <Sheet open={viewSheet} onClose={() => setViewSheet(false)} side="bottom" title="Visualizzazione">
        <div className="space-y-6 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          {isPdfWithText && (
            <div>
              <div id="vs-view" className="mb-2 text-ui font-medium text-fg-muted">Vista</div>
              <Segmented
                ariaLabel="Vista"
                value={view}
                onChange={(v) => setViewPref(v)}
                options={[
                  { value: "testo", label: "Testo" },
                  { value: "pagina", label: "Pagina" },
                ]}
              />
              <p className="mt-2 text-sm leading-relaxed text-fg-subtle">Testo si adatta allo schermo; Pagina mostra il PDF com’è.</p>
            </div>
          )}
          <div>
            <div className="mb-2 text-ui font-medium text-fg-muted">{view === "pagina" ? "Zoom" : "Dimensione del testo"}</div>
            {zoomControls}
          </div>
          {view === "pagina" && (
            <SwitchRow label="Pagina scura" hint="Scurisce il foglio bianco per leggere la sera." checked={night} onChange={(v) => setNightPref(v ? "on" : "off")} />
          )}
          <SwitchRow label="Lettura immersiva" hint="Nasconde menu e barre finché non la chiudi." checked={immersive} onChange={setImmersive} />
        </div>
      </Sheet>

      {cardDraft && (
        <CardModal
          draft={cardDraft}
          doc={doc}
          onClose={() => {
            setCardDraft(null);
            focusReader();
          }}
        />
      )}
      {details}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

// ── Small parts ───────────────────────────────────────────────

function ReaderSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="mx-auto aspect-[1/1.32] w-full max-w-3xl" />
    </div>
  );
}

function Sep() {
  return <span className="mx-1.5 h-5 w-px bg-white/[0.09]" aria-hidden />;
}

const ToggleIcon = function ToggleIcon({
  pressed,
  onClick,
  label,
  icon,
  controls,
  ref,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
  controls?: string;
  ref?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      aria-controls={controls}
      title={label}
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-control transition-colors duration-150",
        pressed ? "bg-white/[0.08] text-azure-200" : "text-fg-muted hover:bg-white/[0.06] hover:text-fg",
      )}
    >
      {icon}
    </button>
  );
};

/** "3 / 12": type a page number and press Enter. */
function PageField({ page, numPages, onGo, compact }: { page: number; numPages: number; onGo: (p: number) => void; compact?: boolean }) {
  const [v, setV] = useState(String(page));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setV(String(page));
    setBad(false);
  }, [page]);
  return (
    <form
      className="flex items-center gap-1.5 text-sm text-fg-muted"
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseInt(v, 10);
        if (!Number.isFinite(n) || n < 1 || n > numPages) {
          setBad(true);
          toast(`Scegli una pagina tra 1 e ${numPages}`, { tone: "warning" });
          return;
        }
        onGo(n);
      }}
    >
      <label htmlFor="reader-page" className="sr-only">
        Vai alla pagina (da 1 a {numPages})
      </label>
      <input
        id="reader-page"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={v}
        onChange={(e) => {
          setV(e.target.value.replace(/\D/g, "").slice(0, 5));
          setBad(false);
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          if (!bad) setV(String(page));
        }}
        aria-invalid={bad || undefined}
        className={cn(
          "h-9 w-11 rounded-lg border bg-white/[0.04] text-center text-base tabular-nums text-fg transition-[border-color,box-shadow] focus:border-azure-400/70 focus:outline-none focus:ring-[3px] focus:ring-azure-500/30 sm:text-sm",
          bad ? "border-danger/60" : "border-white/30 hover:border-white/40",
        )}
      />
      {!compact && (
        <span className="whitespace-nowrap tabular-nums" aria-hidden>
          / {numPages}
        </span>
      )}
    </form>
  );
}

function ZoomGroup({
  label,
  resetLabel,
  decLabel,
  incLabel,
  onDec,
  onInc,
  onReset,
  canDec,
  canInc,
}: {
  label: string;
  resetLabel: string;
  decLabel: string;
  incLabel: string;
  onDec: () => void;
  onInc: () => void;
  onReset: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-control border border-white/[0.08]">
      <Button size="icon" variant="ghost" onClick={onDec} disabled={!canDec} aria-label={decLabel} className="h-9 w-9">
        <Minus className="h-4 w-4" aria-hidden />
      </Button>
      <button
        type="button"
        onClick={onReset}
        title={resetLabel}
        aria-label={`${label}. ${resetLabel}`}
        className="h-9 min-w-14 rounded-lg px-1.5 text-ui tabular-nums text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
      >
        {label}
      </button>
      <Button size="icon" variant="ghost" onClick={onInc} disabled={!canInc} aria-label={incLabel} className="h-9 w-9">
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

function FindField({
  inputRef,
  query,
  setQuery,
  counter,
  total,
  onNext,
  onPrev,
  onEscape,
  onClose,
  disabled,
  className,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  counter: string;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onEscape: () => void;
  onClose?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <form
      role="search"
      aria-label="Cerca nel documento"
      className={cn("flex items-center gap-1", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              onPrev();
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onEscape();
            }
          }}
          placeholder={disabled ? "Nessun testo da cercare" : "Cerca nel documento"}
          aria-label="Cerca nel documento"
          className="h-10 pl-9 pr-3 sm:h-9 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      <span className={cn("shrink-0 text-center text-xs tabular-nums text-fg-subtle", query.trim() ? "w-[4.75rem]" : "sr-only")} aria-live="polite">
        {counter}
      </span>
      {query.trim() && (
        <>
          <Button size="icon" variant="ghost" onClick={onPrev} disabled={!total} aria-label="Occorrenza precedente" title="Precedente (Maiusc+Invio)" className="sm:h-9 sm:w-9">
            <ChevronUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button size="icon" variant="ghost" onClick={onNext} disabled={!total} aria-label="Occorrenza successiva" title="Successiva (Invio)" className="sm:h-9 sm:w-9">
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
        </>
      )}
      {onClose && (
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Chiudi la ricerca" className="sm:h-9 sm:w-9">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </form>
  );
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-fg">{label}</div>
        <p className="mt-0.5 text-sm leading-relaxed text-fg-subtle">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/** A flashcard from the selected passage: the passage is the answer, the student writes the question. */
function CardModal({ draft, doc, onClose }: { draft: { text: string; page: number }; doc: LibraryDoc; onClose: () => void }) {
  const addCards = useAtlas((s) => s.addCards);
  const [front, setFront] = useState("");
  const [back, setBack] = useState(draft.text);
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    if (!front.trim()) {
      setError("Scrivi la domanda a cui risponde il passaggio.");
      document.getElementById("card-front")?.focus();
      return;
    }
    if (!back.trim()) {
      setError("La risposta non può essere vuota.");
      document.getElementById("card-back")?.focus();
      return;
    }
    const n = addCards([{ front: front.trim(), back: `${back.trim()}\n\n(${doc.name}, p. ${draft.page})`, deck: doc.name, subject: doc.subject, origin: "documento" }]);
    if (n) toast("Flashcard creata", { description: `Nel mazzo «${doc.name}»: la ripasserai nelle Flashcard.` });
    else toast("Questa flashcard esiste già", { tone: "warning", description: "Nel mazzo c’è già una carta con la stessa domanda." });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Nuova flashcard"
      description={`Dal passaggio di pagina ${draft.page}, nel mazzo «${doc.name}».`}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button variant="primary" type="submit" form="card-form">Crea flashcard</Button>
        </div>
      }
    >
      <form
        id="card-form"
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <Label htmlFor="card-front">Domanda</Label>
          <Textarea
            id="card-front"
            rows={2}
            value={front}
            onChange={(e) => {
              setFront(e.target.value);
              setError(null);
            }}
            placeholder="Che cosa vuoi chiederti? Per esempio: «Che cosa fa la pompa sodio-potassio?»"
            aria-invalid={(!!error && !front.trim()) || undefined}
            aria-describedby={error ? "card-err" : undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save();
              }
            }}
          />
        </div>
        <div>
          <Label htmlFor="card-back">Risposta</Label>
          <Textarea id="card-back" rows={5} value={back} onChange={(e) => setBack(e.target.value)} />
          <p className="mt-1.5 text-xs text-fg-subtle">Il riferimento al documento e alla pagina viene aggiunto in fondo.</p>
        </div>
        {error && (
          <p id="card-err" role="alert" className="text-sm text-orange-300">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
