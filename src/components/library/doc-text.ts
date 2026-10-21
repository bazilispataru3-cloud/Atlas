// Text processing for the library, kept free of browser APIs so it can be tested:
// joining pdf.js text items into words, lines and paragraphs; reflowing plain
// text and Markdown into blocks; accent-insensitive search; and position anchors
// that tie a highlight to one exact passage of a page (not to every copy of it).

// ── PDF text ──────────────────────────────────────────────────

export interface PdfItemLike {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

interface Line {
  text: string;
  y: number;
  size: number;
}

const LIST_MARKER = /^(?:[•▪◦●■◆►‣∙·\-–—*]|\d{1,3}[.)]|[a-zA-Z][.)])\s/;

/**
 * Joins the text items of one PDF page. pdf.js emits explicit space items and
 * splits words into several runs (small caps, kerning), so items are glued
 * when they touch and separated by a space only when there is a visible gap.
 * Lines are grouped into paragraphs by vertical spacing and font size; soft
 * hyphens at line ends are removed; bare page numbers at the top or bottom are dropped.
 */
export function extractPageText(items: PdfItemLike[]): { text: string; headings: string[] } {
  const lines: Line[] = [];
  let cur: { text: string; y: number; size: number; endX: number } | null = null;
  const endLine = () => {
    if (cur) {
      const text = cur.text.replace(/\s+/g, " ").trim();
      if (text) lines.push({ text, y: cur.y, size: cur.size || 10 });
    }
    cur = null;
  };

  for (const it of items) {
    if (!it || typeof it.str !== "string") continue;
    const t = it.transform ?? [1, 0, 0, 1, 0, 0];
    const size = Math.abs(t[3]) || Math.hypot(t[2] ?? 0, t[3] ?? 0) || it.height || 10;
    const x = t[4] ?? 0;
    const y = t[5] ?? 0;
    if (!it.str) {
      if (it.hasEOL) endLine();
      continue;
    }
    if (cur && Math.abs(y - (cur as { y: number }).y) > Math.max(size, (cur as { size: number }).size || size) * 0.6) endLine();
    const blank = !it.str.trim();
    if (!cur) {
      cur = { text: "", y, size: blank ? 0 : size, endX: x };
    } else {
      const c = cur as { text: string; size: number; endX: number };
      const gap = x - c.endX;
      const ref = Math.min(size, c.size || size);
      if (!/\s$/.test(c.text) && !/^\s/.test(it.str) && gap > ref * 0.18) c.text += " ";
    }
    const c = cur as { text: string; size: number; endX: number };
    c.text += it.str;
    c.endX = x + (it.width || 0);
    if (!blank) c.size = Math.max(c.size, size);
    if (it.hasEOL) endLine();
  }
  endLine();

  // Bare page numbers at the very top or bottom are furniture, not content.
  while (lines.length && /^\d{1,4}$/.test(lines[0].text)) lines.shift();
  while (lines.length && /^\d{1,4}$/.test(lines[lines.length - 1].text)) lines.pop();
  if (!lines.length) return { text: "", headings: [] };

  // Body size: the font size that covers most characters.
  const weight = new Map<number, number>();
  for (const l of lines) {
    const k = Math.round(l.size * 2) / 2;
    weight.set(k, (weight.get(k) ?? 0) + l.text.length);
  }
  const body = [...weight].sort((a, b) => b[1] - a[1])[0][0];

  const paras: { text: string; size: number; lines: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = lines[i - 1];
    const last = paras[paras.length - 1];
    const gap = prev ? prev.y - line.y : 0;
    const newPara =
      !prev ||
      !last ||
      gap < -1 ||
      gap > Math.max(prev.size, line.size) * 1.55 ||
      Math.abs(line.size - prev.size) > 0.9 ||
      LIST_MARKER.test(line.text);
    if (newPara) {
      paras.push({ text: line.text, size: line.size, lines: 1 });
    } else if (/\p{L}-$/u.test(last.text) && /^\p{Ll}/u.test(line.text)) {
      last.text = last.text.slice(0, -1) + line.text;
      last.lines++;
    } else {
      last.text += " " + line.text;
      last.lines++;
    }
  }

  const headings = paras
    .filter((p) => p.size >= body * 1.15 && p.lines <= 2 && p.text.length <= 120 && /\p{L}/u.test(p.text) && !/[.;,]$/.test(p.text))
    .map((p) => p.text);
  return { text: paras.map((p) => p.text).join("\n\n"), headings };
}

// ── Plain text and Markdown ───────────────────────────────────

export type Block =
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "p"; text: string }
  | { type: "li"; ordered: boolean; marker?: string; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "hr" };

/** Splits plain text into ~`size`-character pages, preferring paragraph breaks. */
export function splitTextIntoPages(text: string, size = 3000): { page: number; text: string }[] {
  const clean = text.replace(/\r\n?/g, "\n");
  const out: { page: number; text: string }[] = [];
  let i = 0;
  let page = 1;
  while (i < clean.length) {
    let end = Math.min(clean.length, i + size);
    if (end < clean.length) {
      const para = clean.lastIndexOf("\n\n", end);
      const nl = clean.lastIndexOf("\n", end);
      if (para > i + size * 0.5) end = para;
      else if (nl > i + size * 0.6) end = nl;
    }
    const chunk = clean.slice(i, end).replace(/^\n+|\s+$/g, "");
    if (chunk.trim()) out.push({ page: page++, text: chunk });
    i = end;
  }
  return out;
}

const LIST_LINE = /^\s*(?:([-*+•▪◦–])|(\d{1,3}[.)]))\s+(.*)$/;

/**
 * Plain text (lecture transcripts, notes): hard-wrapped lines are joined into
 * paragraphs, list lines stay separate, indentation is dropped. A line that
 * ends a sentence and is clearly shorter than its neighbours closes a paragraph.
 */
export function plainTextBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const chunks = text.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n+/);
  for (const chunk of chunks) {
    const raws = chunk.split("\n").filter((l) => l.trim());
    const lines = raws.map((l) => l.replace(/\s+/g, " ").trim());
    if (!lines.length) continue;
    const max = Math.max(...lines.map((l) => l.length));
    let para = "";
    let inList = false;
    const flush = () => {
      if (para) blocks.push({ type: "p", text: para });
      para = "";
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const li = line.match(LIST_LINE);
      if (li) {
        flush();
        blocks.push({ type: "li", ordered: !!li[2], marker: li[2], text: li[3] });
        inList = true;
        continue;
      }
      const prev = blocks[blocks.length - 1];
      if (inList && !para && prev?.type === "li" && (/^\s/.test(raws[i]) || !/[.!?:;]$/.test(prev.text))) {
        // A wrapped list item continues on the next line.
        prev.text += " " + line;
        continue;
      }
      inList = false;
      if (!para) para = line;
      else if (/\p{L}-$/u.test(para) && /^\p{Ll}/u.test(line)) para = para.slice(0, -1) + line;
      else para += " " + line;
      const endsSentence = /[.!?:»"”)]$/.test(line);
      if (endsSentence && line.length < max * 0.8 && i < lines.length - 1) flush();
    }
    flush();
  }
  return blocks;
}

/** A small, safe Markdown subset: headings, lists, quotes, fenced code, rules, paragraphs. Never HTML. */
export function markdownBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let para: string[] = [];
  let code: string[] | null = null;
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of lines) {
    if (code) {
      if (/^\s*```/.test(raw)) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = null;
      } else code.push(raw);
      continue;
    }
    const line = raw.trim();
    if (/^```/.test(line)) {
      flush();
      code = [];
      continue;
    }
    if (!line) {
      flush();
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*$/);
    if (h) {
      flush();
      blocks.push({ type: "h", level: Math.min(3, h[1].length) as 1 | 2 | 3, text: h[2] });
      continue;
    }
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flush();
      blocks.push({ type: "hr" });
      continue;
    }
    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev?.type === "quote" && q[1]) prev.text += " " + q[1];
      else if (q[1]) blocks.push({ type: "quote", text: q[1] });
      continue;
    }
    const li = raw.match(/^\s*(?:([-*+])|(\d{1,3}[.)]))\s+(.*)$/);
    if (li) {
      flush();
      blocks.push({ type: "li", ordered: !!li[2], marker: li[2], text: li[3].replace(/^\[( |x)\]\s*/i, (m) => (/x/i.test(m) ? "✓ " : "")) });
      continue;
    }
    const prev = blocks[blocks.length - 1];
    if (!para.length && prev?.type === "li" && /^\s{2,}/.test(raw)) {
      prev.text += " " + line;
      continue;
    }
    para.push(line);
  }
  if (code) blocks.push({ type: "code", text: code.join("\n") });
  flush();
  return blocks;
}

/** Text of a PDF page (paragraphs separated by blank lines) as blocks; detected headings become h3. */
export function pdfTextBlocks(text: string, headings: string[] = []): Block[] {
  const hs = new Set(headings);
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map<Block>((p) => {
      if (hs.has(p)) return { type: "h", level: 3, text: p };
      const li = p.match(/^([•▪◦●■◆►‣∙·\-–—*]|\d{1,3}[.)])\s+(.*)$/s);
      if (li) return { type: "li", ordered: /\d/.test(li[1]), marker: /\d/.test(li[1]) ? li[1] : undefined, text: li[2] };
      return { type: "p", text: p };
    });
}

/** Markdown link syntax becomes plain text with the address in brackets (nothing is turned into HTML). */
export function stripMdLinks(s: string): string {
  return s.replace(/!?\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)/g, (_, label: string, url: string) => (label ? `${label} (${url})` : url));
}

export function looksLikeMarkdown(text: string): boolean {
  const sample = text.slice(0, 6000);
  const hits = (sample.match(/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)/gm) ?? []).length + (sample.match(/\*\*[^*\n]+\*\*/g) ?? []).length;
  return hits >= 3;
}

// ── Accent-insensitive folding ────────────────────────────────

const QUOTES: Record<string, string> = { "’": "'", "‘": "'", "`": "'", "´": "'", "“": '"', "”": '"', "«": '"', "»": '"', " ": " ", "­": "" };

/** Folds one character for matching: lower case, no accents, ligatures expanded, curly quotes straightened. */
export function foldChar(ch: string): string {
  const q = QUOTES[ch];
  if (q !== undefined) return q;
  if (/\s/.test(ch)) return " ";
  return ch.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

export interface Folded {
  /** Folded text, whitespace collapsed to single spaces. */
  text: string;
  /** For each folded character, the index of its source character. */
  map: number[];
}

/** Folds a whole string, keeping a map back to the original indices (for snippets and marks). */
export function foldWithMap(s: string): Folded {
  let text = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of s) {
    const f = foldChar(ch);
    for (const c of f) {
      if (c === " " && (text.length === 0 || text.endsWith(" "))) continue;
      text += c;
      map.push(i);
    }
    i += ch.length;
  }
  return { text, map };
}

export const fold = (s: string) => foldWithMap(s).text.trim();

/** Start indices of every occurrence of `q` in `text` (both already folded). */
export function findAll(text: string, q: string, limit = 2000): number[] {
  const out: number[] = [];
  if (!q) return out;
  for (let i = text.indexOf(q); i >= 0 && out.length < limit; i = text.indexOf(q, i + Math.max(1, q.length))) out.push(i);
  return out;
}

/** Matches of a query in an original string, as [start, end) ranges of the original. */
export function matchRanges(original: string, query: string, limit = 500): [number, number][] {
  const q = fold(query);
  if (q.length < 1) return [];
  const f = foldWithMap(original);
  return findAll(f.text, q, limit).map((s) => {
    const e = s + q.length - 1;
    const endSrc = f.map[e] ?? original.length - 1;
    const endChar = original.codePointAt(endSrc) ?? 0;
    return [f.map[s], endSrc + (endChar > 0xffff ? 2 : 1)];
  });
}

/** A short excerpt around the first match, with the match range inside the excerpt. */
export function snippet(original: string, query: string, radius = 70): { text: string; mark: [number, number] | null } | null {
  const r = matchRanges(original, query, 1)[0];
  if (!r) return null;
  let start = Math.max(0, r[0] - radius);
  let end = Math.min(original.length, r[1] + radius + 40);
  if (start > 0) {
    const sp = original.indexOf(" ", start);
    if (sp > 0 && sp < r[0]) start = sp + 1;
  }
  if (end < original.length) {
    const sp = original.lastIndexOf(" ", end);
    if (sp > r[1]) end = sp;
  }
  const text = (start > 0 ? "…" : "") + original.slice(start, end).replace(/\s+/g, " ") + (end < original.length ? "…" : "");
  // Recompute the mark on the excerpt (whitespace may have collapsed).
  const m = matchRanges(text, query, 1)[0] ?? null;
  return { text, mark: m };
}

// ── Position anchors for highlights ───────────────────────────

/**
 * A highlight is stored as the passage itself plus where it sits on the page:
 * its position in the page text without spaces and a few characters of context
 * before and after. Spaces are ignored because the PDF page and the reflowed
 * text view of the same page differ only in spacing and line breaks.
 */
export interface TextAnchor {
  /** Folded passage without spaces. */
  q: string;
  /** Position of the passage in the folded page text without spaces. */
  pos: number;
  /** Up to 32 folded characters before and after (no spaces). */
  pre: string;
  suf: string;
}

interface Squashed {
  text: string;
  /** squashed index → folded index */
  map: number[];
}

export function squash(folded: string): Squashed {
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < folded.length; i++) {
    if (folded[i] === " ") continue;
    text += folded[i];
    map.push(i);
  }
  return { text, map };
}

const CONTEXT = 32;

/** Builds an anchor for the folded range [start, end) of a page's folded text. */
export function createAnchor(folded: string, start: number, end: number): TextAnchor | null {
  const sq = squash(folded);
  const s = sq.map.findIndex((i) => i >= start);
  if (s < 0) return null;
  let e = s;
  while (e < sq.map.length && sq.map[e] < end) e++;
  if (e <= s) return null;
  const q = sq.text.slice(s, e);
  return { q, pos: s, pre: sq.text.slice(Math.max(0, s - CONTEXT), s), suf: sq.text.slice(e, e + CONTEXT) };
}

const commonSuffix = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
};
const commonPrefix = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

/**
 * Finds the anchored passage in a page's folded text and returns its folded
 * range. With several identical passages the one with the matching context and
 * position wins; a passage saved without an anchor (older versions) matches its
 * first occurrence only.
 */
export function locateAnchor(folded: string, anchor: Partial<TextAnchor> & { q: string }): [number, number] | null {
  if (!anchor.q) return null;
  const sq = squash(folded);
  const hits = findAll(sq.text, anchor.q, 200);
  if (!hits.length) return null;
  let best = hits[0];
  if (hits.length > 1 && (anchor.pre !== undefined || anchor.pos !== undefined)) {
    let bestScore = -Infinity;
    for (const h of hits) {
      const pre = anchor.pre ? commonSuffix(sq.text.slice(Math.max(0, h - CONTEXT), h), anchor.pre) : 0;
      const suf = anchor.suf ? commonPrefix(sq.text.slice(h + anchor.q.length, h + anchor.q.length + CONTEXT), anchor.suf) : 0;
      const dist = anchor.pos !== undefined ? Math.abs(h - anchor.pos) / Math.max(1, sq.text.length) : 0;
      const score = pre + suf - dist * 20;
      if (score > bestScore) {
        bestScore = score;
        best = h;
      }
    }
  }
  const start = sq.map[best];
  const end = sq.map[best + anchor.q.length - 1] + 1;
  return [start, end];
}

/** The anchor query of a passage saved as plain text (older highlights). */
export const legacyAnchor = (text: string) => ({ q: squash(fold(text)).text });
