"use client";

import { Fragment, useEffect, useMemo, useRef, type ReactNode } from "react";
import { inlineMd, markdownBlocks, pdfTextBlocks, plainTextBlocks, type Block } from "./doc-text";

export type TextSource = "pdf" | "markdown" | "plain";

export function blocksFor(source: TextSource, text: string, headings?: string[]): Block[] {
  if (source === "pdf") return pdfTextBlocks(text, headings);
  if (source === "markdown") return markdownBlocks(text);
  return plainTextBlocks(text);
}

/** Inline text: Markdown keeps only bold; everything is rendered as text, never as HTML. */
function Inline({ text, markdown }: { text: string; markdown: boolean }) {
  if (!markdown) return <>{text}</>;
  const { text: plain, bold } = inlineMd(text);
  if (!bold.length) return <>{plain}</>;
  const out: ReactNode[] = [];
  let pos = 0;
  bold.forEach(([s, e], i) => {
    if (s > pos) out.push(<Fragment key={`t${i}`}>{plain.slice(pos, s)}</Fragment>);
    out.push(
      <strong key={`b${i}`} className="font-semibold text-fg">
        {plain.slice(s, e)}
      </strong>,
    );
    pos = e;
  });
  if (pos < plain.length) out.push(<Fragment key="end">{plain.slice(pos)}</Fragment>);
  return <>{out}</>;
}

type Group = { kind: "block"; block: Block } | { kind: "list"; ordered: boolean; start?: number; items: Extract<Block, { type: "li" }>[] };

function group(blocks: Block[]): Group[] {
  const out: Group[] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (b.type === "li") {
      if (last?.kind === "list" && last.ordered === b.ordered) last.items.push(b);
      else out.push({ kind: "list", ordered: b.ordered, start: b.ordered && b.marker ? parseInt(b.marker, 10) || 1 : undefined, items: [b] });
    } else out.push({ kind: "block", block: b });
  }
  return out;
}

/**
 * The "Testo" view: the text of one page reflowed for comfortable reading
 * (one column of about 65 characters, the chosen size, generous leading).
 * `onReady` receives the article after every render, for highlights and search.
 */
export function TextView({
  text,
  source,
  headings,
  size,
  onReady,
  empty,
}: {
  text: string;
  source: TextSource;
  headings?: string[];
  size: number;
  onReady: (el: HTMLElement | null) => void;
  empty?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const blocks = useMemo(() => blocksFor(source, text, headings), [source, text, headings]);
  const groups = useMemo(() => group(blocks), [blocks]);
  const md = source === "markdown";

  useEffect(() => {
    onReady(ref.current);
    return () => onReady(null);
  }, [onReady, groups]);

  if (!blocks.length) return <>{empty}</>;

  return (
    <article
      ref={ref}
      lang="it"
      className="mx-auto max-w-[66ch] text-fg-reading [hyphens:auto] [overflow-wrap:break-word] [text-wrap:pretty]"
      style={{ fontSize: size, lineHeight: size >= 20 ? 1.65 : 1.72 }}
    >
      {groups.map((g, i) => {
        const first = i === 0;
        if (g.kind === "list") {
          const Tag = g.ordered ? "ol" : "ul";
          return (
            <Tag
              key={i}
              start={g.start}
              className={`${first ? "" : "mt-[0.9em]"} space-y-[0.35em] pl-[1.4em] ${g.ordered ? "list-decimal" : "list-disc"} marker:text-fg-subtle`}
            >
              {g.items.map((li, j) => (
                <li key={j} className="pl-1">
                  <Inline text={li.text} markdown={md} />
                </li>
              ))}
            </Tag>
          );
        }
        const b = g.block;
        switch (b.type) {
          case "h": {
            const Tag = b.level === 1 ? "h2" : b.level === 2 ? "h3" : "h4";
            return (
              <Tag
                key={i}
                className={`${first ? "" : "mt-[1.6em]"} font-semibold tracking-[-0.01em] text-fg [text-wrap:balance]`}
                style={{ fontSize: b.level === 1 ? "1.35em" : b.level === 2 ? "1.18em" : "1.04em", lineHeight: 1.3 }}
              >
                <Inline text={b.text} markdown={md} />
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote key={i} className={`${first ? "" : "mt-[0.9em]"} border-l-2 border-azure-400/40 pl-4 text-fg-muted`}>
                <Inline text={b.text} markdown={md} />
              </blockquote>
            );
          case "code":
            return (
              <pre key={i} className={`${first ? "" : "mt-[0.9em]"} overflow-x-auto rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 font-mono text-[0.82em] leading-relaxed text-fg-muted`}>
                {b.text}
              </pre>
            );
          case "hr":
            return <hr key={i} className="my-[1.4em] border-white/[0.09]" />;
          default:
            return (
              <p key={i} className={first ? "" : "mt-[0.9em]"}>
                <Inline text={b.text} markdown={md} />
              </p>
            );
        }
      })}
    </article>
  );
}
