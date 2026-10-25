import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Inline markup: **bold**, *italic*, _italic_, `code`. No HTML is ever injected. */
export function inline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${keyPrefix}${k++}`}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyPrefix}${k++}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={`${keyPrefix}${k++}`} className="rounded bg-white/[0.07] px-1 py-0.5 font-mono text-[0.88em] text-fg">{tok.slice(1, -1)}</code>);
    else out.push(<em key={`${keyPrefix}${k++}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={`${keyPrefix}${k++}`}>{text.slice(last)}</Fragment>);
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{inline(text)}</span>;
}

export function Paragraphs({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn("prose-atlas", className)}>
      {items.map((p, i) => (
        <p key={i}>{inline(p, `p${i}-`)}</p>
      ))}
    </div>
  );
}

/** Minimal, safe Markdown renderer for AI answers (headings, lists, paragraphs, quotes). */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={`p${blocks.length}`}>{inline(para.join(" "), `mp${blocks.length}-`)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={`l${blocks.length}`} className={cn("my-2 space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc marker:text-fg-subtle")}>
          {list.items.map((it, i) => (
            <li key={i}>{inline(it, `li${blocks.length}-${i}-`)}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const quote = line.match(/^>\s?(.*)$/);
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (h) {
      flushPara();
      flushList();
      blocks.push(
        <h4 key={`h${blocks.length}`} className="mb-1 mt-4 text-base font-semibold text-fg first:mt-0">
          {inline(h[2], `h${blocks.length}-`)}
        </h4>,
      );
    } else if (ul || ol) {
      flushPara();
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
    } else if (quote) {
      flushPara();
      flushList();
      blocks.push(
        <blockquote key={`q${blocks.length}`} className="my-2 border-l-2 border-azure-400/40 pl-3 text-fg-muted">
          {inline(quote[1], `q${blocks.length}-`)}
        </blockquote>,
      );
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return <div className={cn("prose-atlas space-y-2 [&_p+p]:mt-2", className)}>{blocks}</div>;
}
