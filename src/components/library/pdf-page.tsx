"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Loader2 } from "lucide-react";
import { loadPdfjs } from "@/lib/library";
import { cn } from "@/lib/utils";

/** Inverts the white page into dark grey with the hues kept (figures stay recognisable). */
const NIGHT_FILTER = "invert(0.88) hue-rotate(180deg) brightness(1.04) contrast(0.96)";

/**
 * One PDF page: a HiDPI canvas plus the selectable pdf.js text layer. The box
 * takes its final size before the canvas is drawn, so turning pages does not
 * make the layout jump. `onReady` receives the text layer once it is rendered.
 */
export function PdfPage({
  pdf,
  page,
  zoom,
  night,
  onReady,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  zoom: number;
  night: boolean;
  onReady: (layer: HTMLDivElement | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  const [width, setWidth] = useState(0);
  const [drawing, setDrawing] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    readyRef.current = onReady;
  });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(Math.floor(el.clientWidth)));
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    let textLayer: { cancel: () => void } | null = null;
    setDrawing(true);
    setFailed(false);
    readyRef.current(null);
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const p = await pdf.getPage(page);
        if (cancelled) return;
        const base = p.getViewport({ scale: 1 });
        const scale = Math.min(4, (width / base.width) * zoom);
        const viewport = p.getViewport({ scale });
        const ratio = Math.min(2.5, window.devicePixelRatio || 1);
        const box = pageRef.current!;
        const w = Math.floor(viewport.width);
        const h = Math.floor(viewport.height);
        box.style.width = `${w}px`;
        box.style.height = `${h}px`;
        box.style.setProperty("--total-scale-factor", String(scale));
        // Draw off-screen, then swap: the previous page stays visible until the new one is ready.
        const off = document.createElement("canvas");
        off.width = Math.floor(viewport.width * ratio);
        off.height = Math.floor(viewport.height * ratio);
        renderTask = p.render({ canvas: off, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
        await renderTask.promise;
        if (cancelled) return;
        const canvas = canvasRef.current!;
        canvas.width = off.width;
        canvas.height = off.height;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        canvas.getContext("2d")?.drawImage(off, 0, 0);
        const layer = layerRef.current!;
        layer.replaceChildren();
        const tl = new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: layer, viewport });
        textLayer = tl;
        await tl.render();
        if (cancelled) return;
        setDrawing(false);
        readyRef.current(layer);
      } catch {
        if (!cancelled) {
          setDrawing(false);
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, page, zoom, width]);

  return (
    <div ref={wrapRef} className="w-full">
      <div
        ref={pageRef}
        className={cn(
          "pdf-page relative mx-auto overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_24px_60px_-24px_rgb(0_0_0/0.9)] transition-colors duration-200",
          night ? "bg-[#1f2024]" : "bg-white",
        )}
        style={{ minHeight: 240 }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 block" style={{ filter: night ? NIGHT_FILTER : undefined }} aria-hidden />
        <div ref={layerRef} className="textLayer" />
        {drawing && (
          <div className="pointer-events-none absolute right-3 top-3 z-[2] grid h-8 w-8 place-items-center rounded-full bg-ink-900/80" role="status">
            <Loader2 className="h-4 w-4 animate-spin text-azure-300" aria-hidden />
            <span className="sr-only">Caricamento della pagina {page}</span>
          </div>
        )}
        {failed && (
          <div className={cn("absolute inset-0 z-[2] grid place-items-center p-6 text-center text-sm", night ? "text-fg" : "text-ink-950")} role="alert">
            Questa pagina non si riesce a disegnare. Prova la vista Testo o ricarica la pagina.
          </div>
        )}
      </div>
    </div>
  );
}
