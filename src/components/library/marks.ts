"use client";

// DOM side of highlights and search. The reading surface (the pdf.js text
// layer of a page, or the reflowed text of the "Testo" view) is indexed as one
// string of its text nodes; anchors and search matches are located in that
// string and turned back into DOM Ranges, which are painted with the CSS
// Custom Highlight API: no markup is injected into the page.

import { createAnchor, foldWithMap, foldedToSource, locateAnchor, matchRangesLoose, sourceToFolded, type Folded, type TextAnchor } from "./doc-text";
import { HL, HL_COLORS, SEARCH_FILL } from "./shared";
import type { HighlightColor } from "@/lib/library";

export interface TextIndex {
  text: string;
  nodes: { node: Text; start: number }[];
  folded: Folded;
}

/** Concatenates the text nodes under `root` (elements marked data-no-index are skipped). */
export function indexText(root: HTMLElement): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest("[data-no-index]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: TextIndex["nodes"] = [];
  let text = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (!t.data) continue;
    nodes.push({ node: t, start: text.length });
    text += t.data;
  }
  return { text, nodes, folded: foldWithMap(text) };
}

function locate(index: TextIndex, pos: number, end = false): { node: Text; offset: number } | null {
  const { nodes } = index;
  if (!nodes.length) return null;
  let lo = 0;
  let hi = nodes.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    // For an end position that falls exactly on a boundary, stay in the previous node.
    if (end ? nodes[mid].start < pos : nodes[mid].start <= pos) lo = mid;
    else hi = mid - 1;
  }
  const n = nodes[lo];
  return { node: n.node, offset: Math.max(0, Math.min(n.node.data.length, pos - n.start)) };
}

/** DOM Range for the source range [start, end) of the index. */
export function rangeAt(index: TextIndex, start: number, end: number): Range | null {
  if (end <= start) return null;
  const a = locate(index, start);
  const b = locate(index, end, true);
  if (!a || !b) return null;
  try {
    const r = document.createRange();
    r.setStart(a.node, a.offset);
    r.setEnd(b.node, b.offset);
    return r;
  } catch {
    return null;
  }
}

/** Source range of a selection, clipped to the indexed surface. */
export function selectionToSource(index: TextIndex, range: Range): [number, number] | null {
  let s = -1;
  let e = -1;
  for (const { node, start } of index.nodes) {
    if (!range.intersectsNode(node)) continue;
    const from = node === range.startContainer ? range.startOffset : 0;
    const to = node === range.endContainer ? range.endOffset : node.data.length;
    if (to <= from) continue;
    if (s < 0) s = start + from;
    e = start + to;
  }
  return s >= 0 && e > s ? [s, e] : null;
}

/** Anchor (position + context) of a source range of the surface. */
export function anchorFor(index: TextIndex, s: number, e: number): TextAnchor | null {
  const [fs, fe] = sourceToFolded(index.folded, s, e);
  return createAnchor(index.folded.text, fs, fe);
}

/** DOM Range of an anchored passage on the surface (the best match by context and position). */
export function rangeForAnchor(index: TextIndex, anchor: Partial<TextAnchor> & { q: string }): Range | null {
  const hit = locateAnchor(index.folded.text, anchor);
  if (!hit) return null;
  const [s, e] = foldedToSource(index.folded, index.text, hit[0], hit[1]);
  return rangeAt(index, s, e);
}

/** DOM Ranges of every match of `query` (case, accents and spaces ignored). */
export function searchRanges(index: TextIndex, query: string, limit = 800): Range[] {
  return matchRangesLoose(index.text, query, limit)
    .map(([s, e]) => rangeAt(index, s, e))
    .filter((r): r is Range => !!r);
}

// ── Painting ──────────────────────────────────────────────────

type HighlightRegistryLike = { set: (name: string, h: unknown) => void; delete: (name: string) => void };
type HighlightCtor = new (...ranges: Range[]) => { priority: number };

const registry = (): HighlightRegistryLike | null => {
  if (typeof CSS === "undefined") return null;
  return ((CSS as unknown as { highlights?: HighlightRegistryLike }).highlights ?? null) as HighlightRegistryLike | null;
};
const HighlightImpl = (): HighlightCtor | null => (typeof window !== "undefined" ? ((window as unknown as { Highlight?: HighlightCtor }).Highlight ?? null) : null);

export const canPaint = () => !!registry() && !!HighlightImpl();

export const PAINT_NAMES = [...HL_COLORS.map((c) => `atlas-${c}`), "atlas-search", "atlas-search-current"];

/** Paints (or clears, with no ranges) one named highlight. */
export function paint(name: string, ranges: Range[], priority = 0) {
  const reg = registry();
  const H = HighlightImpl();
  if (!reg || !H) return;
  if (!ranges.length) {
    reg.delete(name);
    return;
  }
  const h = new H(...ranges);
  h.priority = priority;
  reg.set(name, h);
}

export function clearPaint() {
  const reg = registry();
  if (reg) for (const n of PAINT_NAMES) reg.delete(n);
}

export function paintMarks(marks: { color: HighlightColor; range: Range }[]) {
  for (const c of HL_COLORS) paint(`atlas-${c}`, marks.filter((m) => m.color === c).map((m) => m.range), 1);
}

/**
 * Styles of the painted ranges. Three surfaces: the white PDF page (day), the
 * inverted page (night) and the reflowed text on the dark canvas.
 */
export const HIGHLIGHT_CSS = [
  ...HL_COLORS.flatMap((c) => [
    `[data-surface="pdf-day"] ::highlight(atlas-${c}){background-color:${HL[c].day}}`,
    `[data-surface="pdf-night"] ::highlight(atlas-${c}){background-color:${HL[c].night}}`,
    `[data-surface="text"] ::highlight(atlas-${c}){background-color:${HL[c].text};color:#fff}`,
  ]),
  `[data-surface="pdf-day"] ::highlight(atlas-search){background-color:${SEARCH_FILL.day}}`,
  `[data-surface="pdf-night"] ::highlight(atlas-search){background-color:${SEARCH_FILL.night}}`,
  `[data-surface="text"] ::highlight(atlas-search){background-color:${SEARCH_FILL.text};color:#fff}`,
  `[data-surface] ::highlight(atlas-search-current){background-color:${SEARCH_FILL.current};text-decoration:underline 2px rgb(251 146 60);text-underline-offset:3px}`,
  `[data-surface="text"] ::highlight(atlas-search-current){color:#06070a}`,
].join("\n");
