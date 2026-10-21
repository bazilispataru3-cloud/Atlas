"use client";

import { useEffect, useRef, useState } from "react";
import type { Resource } from "@/lib/types";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import { CoverArt, type CoverSubject } from "./cover-art";
import { coverLabel } from "./catalog";

type Size = "feature" | "card" | "row" | "thumb";

/** Image candidates, best first: hq720 is a sharp 16:9 frame; hqdefault exists for every video. */
function sourcesFor(r: Resource, size: Size): { src: string; book: boolean }[] {
  if (r.image) {
    const { width, height } = r.image;
    const book = !!width && !!height && height / width > 0.75;
    return [{ src: r.image.src, book }];
  }
  if (r.youtubeId) {
    const base = `https://i.ytimg.com/vi/${r.youtubeId}`;
    return size === "thumb" ? [{ src: `${base}/mqdefault.jpg`, book: false }] : [{ src: `${base}/hq720.jpg`, book: false }, { src: `${base}/hqdefault.jpg`, book: false }];
  }
  return [];
}

const coverSubject = (r: Resource): CoverSubject => (r.subjects.length === 1 ? r.subjects[0] : "multi");

/**
 * The cover of a resource: the official image (YouTube preview, book cover or
 * the course image published by the provider), or an original ATLAS
 * illustration when none exists or it fails to load. Portrait and square book
 * covers are shown whole, standing on a backdrop tinted by the subject.
 */
export function ResourceCover({ r, size = "card", className }: { r: Resource; size?: Size; className?: string }) {
  const sources = sourcesFor(r, size);
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  const current = sources[index];
  const next = () => setIndex((i) => i + 1);

  useEffect(() => {
    // An error that happens before hydration is not replayed to React.
    const img = ref.current;
    // YouTube answers a missing size with a 120×90 placeholder (and a 404) that may finish before hydration.
    if (img?.complete && (img.naturalWidth === 0 || (r.youtubeId && img.naturalWidth <= 120))) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const premium = r.access === "premium";

  if (!current) {
    const label = coverLabel(r);
    const showLabel = size !== "thumb";
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)} title="Illustrazione originale ATLAS">
        <CoverArt motif={r.cover?.motif ?? "lattice"} seed={r.cover?.seed ?? r.id.length} premium={premium} subject={coverSubject(r)} salt={r.id} className="h-full w-full" />
        {showLabel && (
          <div
            aria-hidden
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 via-ink-950/55 to-transparent",
              size === "row" ? "p-2.5 pt-8" : size === "feature" ? "p-6 pt-20" : "p-4 pt-14",
            )}
          >
            <div
              className={cn(
                "font-display tracking-[-0.01em] text-white/95 [text-wrap:balance]",
                size === "row" ? "line-clamp-2 text-base" : size === "feature" ? "text-4xl sm:text-5xl" : "text-[1.75rem]",
                "leading-[1.05]",
              )}
            >
              {label.big}
            </div>
            {label.small && size !== "row" && <div className="mt-1.5 truncate text-ui text-white/75">{label.small}</div>}
          </div>
        )}
      </div>
    );
  }

  const tint = premium ? TONE.gold.hex : TONE[SUBJECT_TONE[r.subjects[0]] ?? "azure"].hex;
  const credit = r.image?.credit ?? (r.youtubeId ? "Anteprima: YouTube" : undefined);

  if (current.book) {
    return (
      <div
        className={cn("relative h-full w-full overflow-hidden", className)}
        style={{ background: `radial-gradient(90% 120% at 50% 0%, ${tint}38, transparent 70%), linear-gradient(180deg, #151922, #0b0d12)` }}
        title={credit}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={ref}
          key={current.src}
          src={current.src}
          alt={r.image?.alt ?? ""}
          width={r.image?.width}
          height={r.image?.height}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={next}
          className={cn(
            "absolute inset-0 m-auto h-[80%] w-auto max-w-[86%] rounded-[3px] object-contain shadow-[0_18px_36px_-14px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.08)]",
            size === "thumb" && "h-[84%] rounded-[2px]",
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-ink-750", className)} title={credit}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        key={current.src}
        src={current.src}
        alt={r.image?.alt ?? ""}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={next}
        // YouTube answers a missing size with a 120×90 grey placeholder instead of an error.
        onLoad={(e) => r.youtubeId && e.currentTarget.naturalWidth <= 120 && next()}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
