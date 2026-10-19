"use client";

import Link from "next/link";
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { X, Info, AlertTriangle, FlaskConical, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE, type Tone } from "./tone";

// ── Button ────────────────────────────────────────────────────

type ButtonVariant = "primary" | "gold" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-azure-500 text-white shadow-[0_0_0_1px_rgba(143,196,255,0.35)_inset,0_8px_24px_-8px_rgba(47,139,255,0.7)] hover:bg-azure-400 hover:shadow-[0_0_0_1px_rgba(196,224,255,0.5)_inset,0_10px_30px_-8px_rgba(47,139,255,0.85)]",
  gold:
    "bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-[0_0_0_1px_rgba(251,237,196,0.5)_inset,0_8px_24px_-8px_rgba(226,170,47,0.7)] hover:from-gold-200 hover:to-gold-400",
  secondary: "bg-white/[0.07] text-fg hover:bg-white/[0.11] border border-white/[0.08]",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/[0.06]",
  outline: "border border-white/12 text-fg hover:border-white/25 hover:bg-white/[0.04]",
  danger: "bg-red-500/15 text-red-200 border border-red-400/30 hover:bg-red-500/25",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-[15px] rounded-2xl",
  icon: "h-9 w-9 rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, href, external, children, ...props },
  ref,
) {
  const classes = cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className);
  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={classes} type={props.type ?? "button"} {...props}>
      {children}
    </button>
  );
});

// ── Card ──────────────────────────────────────────────────────

export function Card({
  className,
  children,
  hover,
  as: Tag = "div",
  ...rest
}: { className?: string; children: ReactNode; hover?: boolean; as?: "div" | "section" | "article" } & Record<string, unknown>) {
  return (
    <Tag className={cn("card", hover && "card-hover", className)} {...rest}>
      {children}
    </Tag>
  );
}

// ── Badge ─────────────────────────────────────────────────────

export function Badge({
  tone = "muted",
  children,
  className,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        t.text,
        t.bg,
        t.border,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

// ── Progress ──────────────────────────────────────────────────

export function ProgressBar({
  value,
  tone = "azure",
  className,
  label,
}: {
  value: number;
  tone?: Tone;
  className?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${v * 100}%`, background: `linear-gradient(90deg, ${TONE[tone].hex}aa, ${TONE[tone].hex})`, boxShadow: `0 0 12px ${TONE[tone].hex}66` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  tone = "azure",
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  children?: ReactNode;
  label?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gid = useId();
  const color = TONE[tone].hex;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)", filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

// ── Headings ──────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-fade-up", className)}>
      <div className="max-w-3xl">
        {eyebrow && <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-fg-subtle">{eyebrow}</div>}
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-fg md:text-5xl">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, action, icon, className }: { title: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-fg">
        {icon && <span className="text-fg-subtle">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

// ── Notice ────────────────────────────────────────────────────

export function Notice({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: "info" | "warning" | "demo" | "clinical";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const styles = {
    info: { icon: Info, cls: "border-azure-400/25 bg-azure-500/[0.07] text-azure-200" },
    warning: { icon: AlertTriangle, cls: "border-amber-400/25 bg-amber-500/[0.07] text-amber-200" },
    demo: { icon: FlaskConical, cls: "border-fuchsia-300/25 bg-fuchsia-400/[0.07] text-fuchsia-200" },
    clinical: { icon: Stethoscope, cls: "border-emerald-300/25 bg-emerald-400/[0.07] text-emerald-200" },
  }[tone];
  const Icon = styles.icon;
  return (
    <div className={cn("flex gap-3 rounded-2xl border px-4 py-3 text-sm", styles.cls, className)} role={tone === "warning" ? "alert" : "note"}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <div className="font-medium text-fg">{title}</div>}
        {children && <div className={cn("leading-relaxed text-fg-muted", title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.05] text-fg-muted">{icon}</div>}
      <div className="text-sm font-medium text-fg">{title}</div>
      {description && <div className="mt-1 max-w-sm text-[13px] leading-relaxed text-fg-subtle">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Form controls ─────────────────────────────────────────────

const FIELD = "w-full rounded-xl border border-white/10 bg-white/[0.035] px-3.5 text-sm text-fg placeholder:text-fg-subtle transition focus:border-azure-400/60 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-azure-500/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(FIELD, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(FIELD, "py-3 leading-relaxed", className)} {...props} />;
});

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, "h-10 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a6a6b3' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  );
}

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-[12px] font-medium text-fg-muted", className)}>
      {children}
    </label>
  );
}

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-azure-400/50 bg-azure-500" : "border-white/10 bg-white/[0.08]",
      )}
    >
      <span className={cn("inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-[3px]")} />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("no-scrollbar inline-flex max-w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-lg font-medium transition-all",
            size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
            value === o.value ? "bg-white/[0.1] text-fg shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]" : "text-fg-subtle hover:text-fg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Modal & Sheet ─────────────────────────────────────────────

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

function useFocusOnOpen(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[autofocus], input, textarea, button:not([data-close])");
      (el ?? ref.current)?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      prev?.focus?.();
    };
  }, [open]);
  return ref;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
}) {
  useEscape(open, onClose);
  const ref = useFocusOnOpen(open);
  if (!open || typeof document === "undefined") return null;
  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850/95 shadow-2xl outline-none backdrop-blur-xl animate-fade-up sm:rounded-3xl",
          width,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 pb-4 pt-5">
            <div>
              {title && <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>}
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <button data-close onClick={onClose} className="rounded-lg p-1.5 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Chiudi">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-white/[0.06] px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  side = "right",
  width = "max-w-md",
  tone,
  headerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  side?: "right" | "bottom";
  width?: string;
  tone?: "gold" | "azure";
  headerExtra?: ReactNode;
}) {
  useEscape(open, onClose);
  const ref = useFocusOnOpen(open);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col border-white/10 bg-ink-850/97 shadow-2xl outline-none backdrop-blur-xl",
          side === "right"
            ? cn("inset-y-0 right-0 w-full border-l animate-[fade-in_.25s_ease-out]", width)
            : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t animate-fade-up",
          tone === "gold" && "border-gold-400/25",
        )}
      >
        <div className={cn("flex items-center justify-between gap-3 border-b px-5 py-4", tone === "gold" ? "border-gold-400/15" : "border-white/[0.06]")}>
          <div className="min-w-0 flex-1">{typeof title === "string" ? <h2 className="text-base font-semibold text-fg">{title}</h2> : title}</div>
          {headerExtra}
          <button data-close onClick={onClose} className="rounded-lg p-1.5 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ── Misc ──────────────────────────────────────────────────────

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">{children}</kbd>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden />;
}

export function Stat({ label, value, hint, icon, tone = "muted" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
        {icon && <span className={TONE[tone].text}>{icon}</span>}
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-medium tracking-tight text-fg tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-fg-subtle">{hint}</div>}
    </div>
  );
}
