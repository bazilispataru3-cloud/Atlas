"use client";

import { useCallback, useEffect, useState } from "react";
import { FileAudio, FileText, FileType2, NotebookPen, type LucideIcon } from "lucide-react";
import type { LibraryDoc } from "@/lib/store";
import type { DocMeta, HighlightColor } from "@/lib/library";
import { fmt } from "@/lib/utils";

// ── Highlight colours ─────────────────────────────────────────
// Four reading colours. None of them is gold: gold belongs to premium only.

export const HL_COLORS: HighlightColor[] = ["azure", "green", "rose", "violet"];

export const HL: Record<HighlightColor, { label: string; swatch: string; day: string; night: string; text: string }> = {
  azure: { label: "blu", swatch: "#5b9dff", day: "rgb(61 139 255 / 0.34)", night: "rgb(61 139 255 / 0.38)", text: "rgb(61 139 255 / 0.30)" },
  green: { label: "verde", swatch: "#4ade80", day: "rgb(34 197 94 / 0.34)", night: "rgb(74 222 128 / 0.30)", text: "rgb(74 222 128 / 0.24)" },
  rose: { label: "rosa", swatch: "#f472b6", day: "rgb(236 72 153 / 0.30)", night: "rgb(244 114 182 / 0.32)", text: "rgb(244 114 182 / 0.26)" },
  violet: { label: "viola", swatch: "#a78bfa", day: "rgb(139 92 246 / 0.30)", night: "rgb(167 139 250 / 0.36)", text: "rgb(167 139 250 / 0.28)" },
};

/** Search matches: orange like the browser's own find bar, the current one stronger and outlined. */
export const SEARCH_FILL = { day: "rgb(251 146 60 / 0.42)", night: "rgb(251 146 60 / 0.40)", text: "rgb(251 146 60 / 0.30)", current: "rgb(251 146 60 / 0.75)" };

type StoredColor = LibraryDoc["highlights"][number]["color"];

/** The store keeps three colour slots; the exact colour lives in the document metadata. */
export const toStoredColor = (c: HighlightColor): StoredColor => (c === "rose" ? "rose" : c === "green" ? "gold" : "azure");

/** Colour shown for a highlight: the saved one, else the legacy slot (the old yellow becomes green). */
export function displayColor(h: { id: string; color: StoredColor }, meta?: DocMeta): HighlightColor {
  const c = meta?.marks?.[h.id]?.color;
  if (c) return c;
  return h.color === "gold" ? "green" : h.color;
}

// ── Document types ────────────────────────────────────────────

export type DocType = "pdf" | "sbobina" | "appunti" | "audio";

export const DOC_TYPE: Record<DocType, { label: string; plural: string; icon: LucideIcon }> = {
  pdf: { label: "PDF", plural: "PDF", icon: FileType2 },
  sbobina: { label: "Sbobina", plural: "Sbobine", icon: FileText },
  appunti: { label: "Appunti", plural: "Appunti", icon: NotebookPen },
  audio: { label: "Audio", plural: "Audio", icon: FileAudio },
};

/** Transcripts are recognised by their name; anything else in plain text counts as notes. */
export const guessCategory = (name: string): "sbobina" | "appunti" => (/sbobin|trascri|lezion|registraz/i.test(name) ? "sbobina" : "appunti");

export function docType(doc: LibraryDoc, meta?: DocMeta): DocType {
  if (doc.kind === "pdf") return "pdf";
  if (doc.kind === "audio") return "audio";
  return meta?.category ?? guessCategory(doc.name);
}

export const isMarkdownDoc = (doc: LibraryDoc) => /markdown/.test(doc.mime);

export function sizeLabel(bytes: number) {
  return bytes > 1024 * 1024 ? `${fmt.number(bytes / 1024 / 1024)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ── Per-browser preferences (view mode, night paper, sort) ─────

/** A small preference kept in this browser only; falls back to the default when storage is blocked. */
export function useLocalPref<T extends string>(key: string, fallback: T, allowed?: readonly T[]): [T, (v: T) => void, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key) as T | null;
      if (v !== null && (!allowed || allowed.includes(v))) setValue(v);
    } catch {
      /* storage blocked */
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (v: T) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, v);
      } catch {
        /* storage blocked */
      }
    },
    [key],
  );
  return [value, update, loaded];
}
