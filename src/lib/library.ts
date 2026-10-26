"use client";

// Personal library storage. Files never leave the browser: binaries, the
// extracted text and the reading metadata live in IndexedDB; only the document
// list (names, highlights, bookmarks) lives in the app store.

import { del, get, getMany, set } from "idb-keyval";
import { useAtlas } from "./store";
import { tokens } from "./search";
import { extractPageText, snippetLoose, countLoose, splitTextIntoPages as splitPages, type PdfItemLike, type TextAnchor } from "@/components/library/doc-text";

export interface PageText {
  page: number;
  text: string;
  /** Lines that look like headings (larger type), used for the outline when the PDF has none. */
  headings?: string[];
}

/** Version of the text extraction: documents indexed with an older one are re-read when opened. */
export const TEXT_VERSION = 2;

export type HighlightColor = "azure" | "green" | "rose" | "violet";

/** Reading data kept next to the file (IndexedDB), outside the persisted store. */
export interface DocMeta {
  textVersion?: number;
  lastOpenedAt?: string;
  /** Text documents: a lecture transcript or personal notes. */
  category?: "sbobina" | "appunti";
  /** Per highlight id: the exact colour and the position of the passage on its page. */
  marks?: Record<string, { color: HighlightColor; anchor?: TextAnchor }>;
}

export async function saveDocFile(id: string, file: Blob) {
  await set(`doc:${id}`, file);
}

export async function getDocFile(id: string): Promise<Blob | undefined> {
  return get<Blob>(`doc:${id}`);
}

export async function savePageTexts(id: string, pages: PageText[]) {
  await set(`text:${id}`, pages);
}

export async function getPageTexts(id: string): Promise<PageText[]> {
  return (await get<PageText[]>(`text:${id}`)) ?? [];
}

export async function getDocMeta(id: string): Promise<DocMeta> {
  try {
    return (await get<DocMeta>(`meta:${id}`)) ?? {};
  } catch {
    return {};
  }
}

const metaQueue = new Map<string, Promise<unknown>>();

/** Read-modify-write of a document's metadata, serialised per document. */
export function patchDocMeta(id: string, patch: (m: DocMeta) => DocMeta): Promise<DocMeta> {
  const prev = metaQueue.get(id) ?? Promise.resolve();
  const next = prev
    .catch(() => undefined)
    .then(async () => {
      const m = patch(await getDocMeta(id));
      await set(`meta:${id}`, m);
      return m;
    });
  metaQueue.set(id, next);
  return next;
}

export async function getAllDocMeta(ids: string[]): Promise<Record<string, DocMeta>> {
  if (!ids.length) return {};
  try {
    const metas = await getMany<DocMeta | undefined>(ids.map((id) => `meta:${id}`));
    return Object.fromEntries(ids.map((id, i) => [id, metas[i] ?? {}]));
  } catch {
    return {};
  }
}

export async function deleteDocData(id: string) {
  await Promise.all([del(`doc:${id}`), del(`text:${id}`), del(`meta:${id}`)]);
}

/** Preferences of this browser for the library (the rights confirmation is remembered here). */
export interface LibraryPrefs {
  consentAt?: string;
}

export async function getLibraryPrefs(): Promise<LibraryPrefs> {
  try {
    return (await get<LibraryPrefs>("library:prefs")) ?? {};
  } catch {
    return {};
  }
}

export async function setLibraryPrefs(p: LibraryPrefs) {
  try {
    await set("library:prefs", p);
  } catch {
    /* private mode: the confirmation is asked again next time */
  }
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/**
 * Lazily loads pdf.js with the worker served from /public (copied at install time).
 * The legacy build runs on current Safari, Firefox and Chromium releases; the
 * modern build needs JS APIs that are not yet widely available.
 */
export function loadPdfjs() {
  pdfjsPromise ??= (import("pdfjs-dist/legacy/build/pdf.mjs") as Promise<typeof import("pdfjs-dist")>).then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    return pdfjs;
  });
  return pdfjsPromise;
}

/** Opens a PDF. User files are untrusted input: XFA forms stay disabled and no scripting viewer is attached. */
export async function openPdf(data: ArrayBuffer) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data, enableXfa: false });
  const doc = await task.promise;
  return { doc, close: () => task.destroy() };
}

export async function extractPdfText(data: ArrayBuffer, onProgress?: (p: number) => void): Promise<{ pages: PageText[]; numPages: number }> {
  const { doc, close } = await openPdf(data);
  const pages: PageText[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items = content.items.filter((it): it is PdfItemLike & typeof it => "str" in it);
      const { text, headings } = extractPageText(items as unknown as PdfItemLike[]);
      pages.push({ page: i, text, headings: headings.length ? headings : undefined });
      onProgress?.(i / doc.numPages);
    }
  } finally {
    await close();
  }
  return { pages, numPages: pages.length };
}

/** True when the extracted text is too thin to be real text (a scan or an image-only PDF). */
export const looksScanned = (pages: PageText[]) => pages.reduce((a, p) => a + p.text.length, 0) <= pages.length * 40;

/** Re-reads the text of a PDF indexed with an older extraction (words split by spaces). */
export async function reindexPdf(id: string): Promise<PageText[] | null> {
  const file = await getDocFile(id);
  if (!file) return null;
  const { pages } = await extractPdfText(await file.arrayBuffer());
  await savePageTexts(id, pages);
  await patchDocMeta(id, (m) => ({ ...m, textVersion: TEXT_VERSION }));
  return pages;
}

/** Plain text and notes are split into ~3000-character pseudo-pages, preferring paragraph breaks. */
export function splitTextIntoPages(text: string, size = 3000): PageText[] {
  return splitPages(text, size);
}

export interface LibraryHit {
  docId: string;
  page: number;
  count: number;
  snippet: { text: string; mark: [number, number] | null };
}

/** Searches the text of every document of the library (accents, case and spaces ignored). */
export async function searchLibrary(docIds: string[], query: string, maxPerDoc = 3): Promise<{ docId: string; total: number; hits: LibraryHit[] }[]> {
  if (!docIds.length) return [];
  let all: (PageText[] | undefined)[] = [];
  try {
    all = await getMany<PageText[] | undefined>(docIds.map((id) => `text:${id}`));
  } catch {
    return [];
  }
  const out: { docId: string; total: number; hits: LibraryHit[] }[] = [];
  docIds.forEach((docId, i) => {
    const pages = all[i] ?? [];
    const hits: LibraryHit[] = [];
    let total = 0;
    for (const p of pages) {
      const count = countLoose(p.text, query);
      if (!count) continue;
      total += count;
      if (hits.length < maxPerDoc) {
        const sn = snippetLoose(p.text, query);
        if (sn) hits.push({ docId, page: p.page, count, snippet: sn });
      }
    }
    if (total) out.push({ docId, total, hits });
  });
  return out.sort((a, b) => b.total - a.total);
}

/** BM25 ranking over page-level chunks; returns the best excerpts with page numbers. */
export async function retrieveFromDoc(docId: string, query: string, k = 5): Promise<{ name: string; page: number; text: string }[]> {
  const meta = useAtlas.getState().library.find((d) => d.id === docId);
  const pages = await getPageTexts(docId);
  if (!meta || !pages.length) return [];
  const q = [...new Set(tokens(query))];
  if (!q.length) return [];
  const docs = pages.map((p) => ({ ...p, toks: tokens(p.text) }));
  const avg = docs.reduce((s, d) => s + d.toks.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const t of q) df.set(t, docs.filter((d) => d.toks.includes(t)).length);
  const k1 = 1.4;
  const b = 0.75;
  const scored = docs.map((d) => {
    let score = 0;
    for (const t of q) {
      const n = df.get(t) ?? 0;
      if (!n) continue;
      const tf = d.toks.filter((x) => x === t).length;
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.toks.length) / avg)));
    }
    return { page: d.page, text: d.text, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k)
    .map((s) => ({ name: meta.name, page: s.page, text: s.text.slice(0, 3500) }));
}

/** Concatenates pages with [p. N] markers for AI generation. */
export async function docTextWithMarkers(docId: string, fromPage = 1, toPage = 9999, maxChars = 70_000): Promise<string> {
  const pages = await getPageTexts(docId);
  let out = "";
  for (const p of pages) {
    if (p.page < fromPage || p.page > toPage) continue;
    const chunk = `[p. ${p.page}] ${p.text}\n\n`;
    if (out.length + chunk.length > maxChars) break;
    out += chunk;
  }
  return out;
}
