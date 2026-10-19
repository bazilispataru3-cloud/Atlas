"use client";

// Personal library storage. Files never leave the browser: binaries and the
// extracted text live in IndexedDB; only metadata lives in the app store.

import { del, get, set } from "idb-keyval";
import { useAtlas } from "./store";
import { tokens } from "./search";

export interface PageText {
  page: number;
  text: string;
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

export async function deleteDocData(id: string) {
  await Promise.all([del(`doc:${id}`), del(`text:${id}`)]);
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
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ page: i, text });
    onProgress?.(i / doc.numPages);
  }
  await close();
  return { pages, numPages: pages.length };
}

/** Plain text and notes are split into ~3000-character pseudo-pages. */
export function splitTextIntoPages(text: string, size = 3000): PageText[] {
  const clean = text.replace(/\r/g, "");
  const out: PageText[] = [];
  let i = 0;
  let page = 1;
  while (i < clean.length) {
    let end = Math.min(clean.length, i + size);
    const nl = clean.lastIndexOf("\n", end);
    if (nl > i + size * 0.6) end = nl;
    out.push({ page: page++, text: clean.slice(i, end).trim() });
    i = end;
  }
  return out.filter((p) => p.text);
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
