"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ImageOff, Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { scienceSrcSet, type ScienceImage } from "@/data/imagery";

/** Ratios the figure can be cropped to; "auto" keeps the photo's own proportions. */
export type ScienceAspect = "21/9" | "16/9" | "3/2" | "4/3" | "1/1" | "3/4" | "auto";

export interface ScienceFigureProps {
  image: ScienceImage;
  /** Crop ratio of the frame (object-cover, centred on `image.position`). Default 16/9. */
  aspect?: ScienceAspect;
  /** The `sizes` attribute: how wide the frame is drawn, so the browser picks 640 or 1600. */
  sizes?: string;
  /** Above the fold: load eagerly with high priority and skip the fade-in. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Subtle darkening and edge vignette so the photo sits on the ink surfaces. Default true. */
  grade?: boolean;
  /** Show title and credit under the image instead of the "i" button. Default false. */
  caption?: boolean;
  /** Corner radius by role: card (14px, default), panel (20px, hero) or none (edge to edge). */
  rounded?: "card" | "panel" | "none";
  /** Override the alt text; pass "" when nearby text already describes the image. */
  alt?: string;
  /** Override the object-position of the crop. */
  position?: string;
}

const RADIUS = { card: "rounded-card", panel: "rounded-panel", none: "rounded-none" } as const;

/** Resizing and WebP conversion are the only changes made to every file (CC BY asks to say so). */
export const IMAGE_CHANGES = "Ridimensionata e convertita in WebP, senza altre modifiche.";

/**
 * A scientific photograph with its licence attached. The credit is always reachable:
 * either as a visible caption or through a small "i" button that opens author,
 * licence and source.
 */
export function ScienceFigure({
  image,
  aspect = "16/9",
  sizes = "100vw",
  priority = false,
  className,
  imgClassName,
  grade = true,
  caption = false,
  rounded = "card",
  alt,
  position,
}: ScienceFigureProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(priority ? "loaded" : "loading");

  // An image that finished before hydration never fires onLoad: read its state once mounted.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    setStatus(img.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  const ratio = aspect === "auto" ? `${image.width} / ${image.height}` : aspect.replace("/", " / ");
  const radius = RADIUS[rounded];

  return (
    <figure className={cn("relative min-w-0", className)}>
      <div className={cn("relative isolate overflow-hidden bg-ink-800", radius)} style={{ aspectRatio: ratio }}>
        {status === "error" ? (
          <div className="absolute inset-0 grid place-items-center p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <ImageOff className="h-5 w-5 text-fg-subtle" aria-hidden />
              <p className="text-ui text-fg-subtle">Immagine non disponibile in questo momento.</p>
            </div>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={image.src}
            srcSet={scienceSrcSet(image)}
            sizes={sizes}
            width={image.width}
            height={image.height}
            alt={alt ?? image.alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              grade && "[filter:saturate(0.92)_brightness(0.9)_contrast(1.04)]",
              status === "loading" ? "opacity-0" : "opacity-100",
              imgClassName,
            )}
            style={{ objectPosition: position ?? image.position ?? "50% 50%" }}
          />
        )}
        {grade && status !== "error" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_40%,transparent_58%,rgb(6_7_10/0.5))]"
          />
        )}
        {/* Hairline drawn over the photo so the edge stays crisp on any background. */}
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.08]", radius)} />
      </div>

      {caption ? (
        <figcaption className="mt-2.5 flex max-w-[65ch] flex-col gap-0.5">
          <span className="text-ui text-fg-muted">{image.title}</span>
          <CreditLine image={image} />
        </figcaption>
      ) : (
        <CreditButton image={image} />
      )}
    </figure>
  );
}

/** One line of attribution: author, licence (linked) and source (linked). */
export function CreditLine({ image, className }: { image: ScienceImage; className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-fg-subtle", className)}>
      {image.creditPrefix ?? "Foto"}: {image.author},{" "}
      <ExtLink href={image.licenseUrl}>{image.license}</ExtLink>, via <ExtLink href={image.sourcePage}>{image.via}</ExtLink>
    </p>
  );
}

function ExtLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "rounded-sm underline decoration-white/25 underline-offset-2 transition-colors duration-150 hover:text-fg hover:decoration-white/60",
        className,
      )}
    >
      {children}
      <span className="sr-only"> (si apre in una nuova scheda)</span>
    </a>
  );
}

const GAP = 8;
const TOP_BAR = 56;

/**
 * The "i" button in the bottom-right corner of the frame and its credit card.
 * The card is a non-modal dialog placed with fixed coordinates, so cards with
 * overflow-hidden around the figure cannot clip it; it follows the button in the
 * DOM, so Tab goes from the button into its links. Escape and outside clicks close it.
 */
function CreditButton({ image }: { image: ScienceImage }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setPos(null);
    if (refocus) btnRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btnRef.current?.getBoundingClientRect();
      const p = panelRef.current;
      if (!b || !p) return;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const pw = p.offsetWidth;
      const ph = p.offsetHeight;
      const left = Math.min(Math.max(GAP, b.right - pw), vw - pw - GAP);
      let top = b.top - ph - GAP;
      if (top < TOP_BAR + GAP) top = Math.min(b.bottom + GAP, vh - ph - GAP);
      setPos({ top: Math.max(GAP, top), left });
    };
    place();
    // The card is hidden until placed; focus it on the next frame, once it is visible.
    const raf = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const inside = (n: Node | null) => !!n && (!!panelRef.current?.contains(n) || !!btnRef.current?.contains(n));
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target as Node)) close(false);
    };
    // Escape closes even when focus has moved elsewhere; focus returns to the button only if it was inside.
    // Captured on window and stopped, so a Modal or Sheet around the figure stays open.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close(inside(document.activeElement));
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  const style: CSSProperties = pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: "hidden" };

  return (
    <div
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (open && next && !e.currentTarget.contains(next)) close(false);
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Crediti e licenza: ${image.title}`}
        onClick={() => (open ? close(true) : setOpen(true))}
        className={cn(
          "absolute bottom-2 right-2 z-[1] grid h-8 w-8 place-items-center rounded-full bg-ink-950/70 text-fg-muted ring-1 ring-white/[0.12] backdrop-blur-md transition-colors duration-150",
          "hover:bg-ink-950/90 hover:text-fg aria-expanded:bg-ink-950/90 aria-expanded:text-fg",
          // 44 px touch target around the 32 px disc.
          "before:absolute before:-inset-1.5 before:content-['']",
        )}
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={id}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${id}-t`}
          tabIndex={-1}
          style={style}
          className="surface-overlay fixed z-50 w-[min(20rem,calc(100vw-1rem))] animate-pop-in rounded-card p-4 text-left [animation-fill-mode:backwards] focus-visible:outline-1 focus-visible:outline-offset-0"
        >
          <p id={`${id}-t`} className="text-sm font-medium text-fg">
            {image.title}
          </p>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-ui">
            <dt className="text-fg-subtle">Autore</dt>
            <dd className="text-fg-muted">{image.author}</dd>
            <dt className="text-fg-subtle">Licenza</dt>
            <dd className="text-fg-muted">
              <ExtLink href={image.licenseUrl}>{image.license}</ExtLink>
            </dd>
            <dt className="text-fg-subtle">Fonte</dt>
            <dd className="text-fg-muted">
              <ExtLink href={image.sourcePage} className="inline-flex items-center gap-1">
                {image.via}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </ExtLink>
            </dd>
          </dl>
          <p className="mt-3 text-xs text-fg-subtle">{IMAGE_CHANGES}</p>
        </div>
      )}
    </div>
  );
}
