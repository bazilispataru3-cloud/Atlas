"use client";

import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { X, Info, AlertTriangle, FlaskConical, Stethoscope, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE, type Tone } from "./tone";

// ── Button ────────────────────────────────────────────────────

type ButtonVariant = "primary" | "gold" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const BTN_BASE =
  "relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:opacity-45 disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:pointer-events-none";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  // White on #1A66FF is 4.8:1; hover darkens (never lightens) so the label keeps its contrast.
  primary:
    "bg-azure-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_0_0_1px_rgb(61_139_255/0.55),0_8px_22px_-10px_rgb(26_102_255/0.9)] hover:bg-azure-600 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_0_0_1px_rgb(141_185_255/0.6),0_10px_26px_-8px_rgb(26_102_255/0.95)]",
  gold: "bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_0_0_1px_rgb(239_193_79/0.6),0_8px_22px_-10px_rgb(226_169_46/0.8)] hover:from-gold-200 hover:to-gold-300",
  secondary: "border border-white/[0.09] bg-white/[0.06] text-fg hover:border-white/[0.14] hover:bg-white/[0.1]",
  ghost: "text-fg-muted hover:bg-white/[0.06] hover:text-fg",
  outline: "border border-white/[0.14] text-fg hover:border-white/25 hover:bg-white/[0.04]",
  danger: "border border-danger/30 bg-danger/[0.12] text-red-200 hover:border-danger/50 hover:bg-danger/20",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-ui",
  md: "h-10 rounded-control px-4 text-sm",
  lg: "h-12 rounded-control px-5 text-base",
  icon: "h-10 w-10 rounded-control",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
  /** Shows a spinner, keeps the width and blocks repeated presses. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, href, external, loading, children, disabled, ...props },
  ref,
) {
  const classes = buttonClasses(variant, size, className);
  const content = loading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {size === "icon" || size === "icon-sm" ? null : children}
    </>
  ) : (
    children
  );
  if (href) {
    const linkProps = props as unknown as AnchorHTMLAttributes<HTMLAnchorElement>;
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...linkProps}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} className={classes} type={props.type ?? "button"} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});

export function Spinner({ className, label = "Caricamento" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-fg-muted", className)}>
      <Loader2 className="h-4 w-4 animate-spin text-azure-300" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────

type CardVariant = "panel" | "interactive" | "inset" | "flat";

/**
 * Surfaces by role: `panel` (default) holds a group of content; `interactive`
 * is a whole-card link or button and answers hover with light, not movement;
 * `inset` is a quieter block inside a panel (never nest panels); `flat` is
 * structure only.
 */
export function Card({
  className,
  children,
  hover,
  variant,
  as: Tag = "div",
  ...rest
}: { className?: string; children: ReactNode; hover?: boolean; variant?: CardVariant; as?: "div" | "section" | "article" | "li" } & Record<string, unknown>) {
  const v: CardVariant = variant ?? (hover ? "interactive" : "panel");
  return (
    <Tag
      className={cn(
        v === "panel" && "card",
        v === "interactive" && "card card-hover",
        v === "inset" && "inset-panel",
        v === "flat" && "relative",
        className,
      )}
      {...rest}
    >
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
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
  icon?: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-chip border px-2 text-xs font-medium whitespace-nowrap", t.text, t.bg, t.border, className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}

// ── Progress ──────────────────────────────────────────────────

/** True one frame after mount: lets bars and rings fill from zero instead of appearing full. */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

export function ProgressBar({
  value,
  tone = "azure",
  className,
  label,
  size = "md",
}: {
  value: number;
  tone?: Tone;
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const mounted = useMounted();
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-white/[0.07]", size === "sm" ? "h-1" : size === "lg" ? "h-2" : "h-1.5", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `${(mounted ? v : 0) * 100}%`, background: TONE[tone].hex }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 6,
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
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const mounted = useMounted();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = TONE[tone].hex;
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(196 210 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (mounted ? v : 0))}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)", opacity: v === 0 ? 0 : 1 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** The signature line: a hairline of electric blue that fills to show progress along the study path. */
export function Meridian({
  value = 1,
  orientation = "horizontal",
  className,
  label,
}: {
  value?: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const horizontal = orientation === "horizontal";
  return (
    <div
      className={cn(horizontal ? "meridian w-full" : "meridian-y h-full", className)}
      {...(label
        ? { role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(v * 100) }
        : { "aria-hidden": true })}
    >
      {v > 0 && <div className="meridian-fill" style={horizontal ? { width: `${v * 100}%` } : { height: `${v * 100}%` }} />}
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
  descriptionClassName,
}: {
  /** Context above the title (e.g. the parent section). Sentence case, never a shouted label. */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  descriptionClassName?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-fg-subtle">{eyebrow}</div>}
        <h1 className="font-display text-[2rem] leading-[1.08] font-normal tracking-[-0.015em] text-fg sm:text-4xl">{title}</h1>
        {description && <p className={cn("mt-3 max-w-[62ch] text-base leading-relaxed text-fg-muted", descriptionClassName)}>{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({
  title,
  action,
  icon,
  description,
  className,
  id,
  as: Tag = "h2",
}: {
  title: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  className?: string;
  id?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <Tag id={id} className="flex items-center gap-2 text-base font-semibold tracking-[-0.005em] text-fg">
          {icon && <span className="text-fg-subtle" aria-hidden>{icon}</span>}
          {title}
        </Tag>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Notice ────────────────────────────────────────────────────

type NoticeTone = "info" | "warning" | "demo" | "clinical" | "success" | "danger";

const NOTICE: Record<NoticeTone, { icon: typeof Info; box: string; icon_: string }> = {
  info: { icon: Info, box: "border-azure-400/20 bg-azure-500/[0.06]", icon_: "text-azure-300" },
  warning: { icon: AlertTriangle, box: "border-warning/25 bg-warning/[0.06]", icon_: "text-warning" },
  demo: { icon: FlaskConical, box: "border-white/10 bg-white/[0.03]", icon_: "text-fg-muted" },
  clinical: { icon: Stethoscope, box: "border-success/20 bg-success/[0.05]", icon_: "text-success" },
  success: { icon: CheckCircle2, box: "border-success/25 bg-success/[0.06]", icon_: "text-success" },
  danger: { icon: XCircle, box: "border-danger/30 bg-danger/[0.07]", icon_: "text-danger" },
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
  action,
  live,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
  /** Announce to screen readers when it appears (errors, results). Static notes stay silent. */
  live?: boolean;
}) {
  const s = NOTICE[tone];
  const Icon = s.icon;
  return (
    <div
      className={cn("flex gap-3 rounded-card border px-4 py-3 text-sm", s.box, className)}
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.icon_)} aria-hidden />
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
    <div className={cn("flex flex-col items-center justify-center rounded-card border border-dashed border-white/[0.1] px-6 py-10 text-center", className)}>
      {icon && <div className="mb-4 grid h-11 w-11 place-items-center rounded-full border border-azure-400/20 bg-azure-500/[0.07] text-azure-300 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>}
      <div className="text-base font-medium text-fg">{title}</div>
      {description && <div className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

// ── Form controls ─────────────────────────────────────────────

/** 16px on phones so iOS never zooms into a field; 14px from `sm`. Border ≥ 3:1 against the panel (WCAG 1.4.11). */
const FIELD =
  "w-full rounded-control border border-white/[0.36] bg-white/[0.03] px-3.5 text-base text-fg placeholder:text-fg-subtle transition-[border-color,background-color,box-shadow] duration-150 hover:border-white/50 focus:border-azure-400/70 focus:bg-white/[0.05] focus:outline-none focus:ring-[3px] focus:ring-azure-500/25 aria-invalid:border-danger/60 disabled:opacity-50 sm:text-sm";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(FIELD, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(FIELD, "py-2.5 leading-relaxed", className)} {...props} />;
});

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(FIELD, "h-10 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 [&>option]:bg-ink-700", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a7adbb' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, htmlFor, className, id }: { children: ReactNode; htmlFor?: string; className?: string; id?: string }) {
  return (
    <label id={id} htmlFor={htmlFor} className={cn("mb-1.5 block text-ui font-medium text-fg-muted", className)}>
      {children}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
  className,
  ...rest
}: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string; className?: string } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "role" | "aria-checked" | "type"
>) {
  return (
    <button
      {...rest}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-azure-400/60 bg-azure-500" : "border-white/[0.36] bg-white/[0.08] hover:bg-white/[0.12]",
        className,
      )}
    >
      <span className={cn("inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]", checked ? "translate-x-[22px]" : "translate-x-[2px]")} />
    </button>
  );
}

/** Moves the selection with the arrow keys, Home and End (WAI-ARIA radio group / tabs pattern). */
function useRovingKeys<T extends string>(values: T[], value: T, onChange: (v: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: ReactKeyboardEvent) => {
    const i = values.indexOf(value);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % values.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + values.length) % values.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = values.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(values[next]);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

/** A single choice among a few options (radio group). For switching panels use `Tabs`. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  ariaLabel,
  wrap,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
  /** Let the options wrap onto several rows instead of scrolling (many options on narrow screens). */
  wrap?: boolean;
}) {
  const { refs, onKeyDown } = useRovingKeys(
    options.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div
      className={cn(
        "inline-flex max-w-full gap-0.5 rounded-control border border-white/[0.12] bg-white/[0.03] p-[3px]",
        wrap ? "flex-wrap" : "no-scrollbar overflow-x-auto",
        className,
      )}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[7px] font-medium transition-[background-color,color,box-shadow] duration-150",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3.5 text-ui",
              active ? "bg-white/[0.1] text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_1px_2px_rgb(0_0_0/0.4)]" : "text-fg-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Ids that tie a tab to its panel: `aria-controls` / `aria-labelledby`. */
export const tabIds = (base: string, value: string) => ({ tab: `${base}-tab-${value}`, panel: `${base}-panel-${value}` });

/**
 * Underlined tabs that switch the panel below. Render the active panel with
 * `<TabPanel base value>`. Scrolls horizontally on narrow screens.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  base,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode; count?: number; icon?: ReactNode }[];
  base: string;
  ariaLabel: string;
  className?: string;
}) {
  const { refs, onKeyDown } = useRovingKeys(
    items.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div className={cn("no-scrollbar fade-x -mx-1 overflow-x-auto px-1", className)}>
      <div role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} className="flex min-w-max gap-1 border-b border-white/[0.07]">
        {items.map((it, i) => {
          const active = it.value === value;
          const ids = tabIds(base, it.value);
          return (
            <button
              key={it.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={ids.tab}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={ids.panel}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(it.value)}
              className={cn(
                "relative -mb-px inline-flex h-10 items-center gap-2 rounded-t-lg px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150",
                active ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {it.icon && <span className={cn("[&_svg]:h-4 [&_svg]:w-4", active ? "text-azure-300" : "text-fg-subtle")} aria-hidden>{it.icon}</span>}
              {it.label}
              {it.count !== undefined && <span className="rounded-md bg-white/[0.07] px-1.5 text-xs tabular-nums text-fg-muted">{it.count}</span>}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-[opacity,transform] duration-200",
                  active ? "scale-x-100 bg-azure-400 opacity-100 shadow-[0_0_8px_rgb(61_139_255/0.7)]" : "scale-x-50 opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TabPanel({ base, value, children, className }: { base: string; value: string; children: ReactNode; className?: string }) {
  const ids = tabIds(base, value);
  return (
    <div id={ids.panel} role="tabpanel" aria-labelledby={ids.tab} tabIndex={0} className={cn("animate-fade-in focus-visible:outline-offset-4", className)}>
      {children}
    </div>
  );
}

// ── Modal & Sheet ─────────────────────────────────────────────

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const focusables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0 && !el.closest("[inert]"));

/** Open dialogs, topmost last: only the topmost one handles Escape and traps Tab. */
const dialogStack: HTMLElement[] = [];

/**
 * Dialog behaviour shared by Modal and Sheet: focus moves inside on open
 * (an [data-autofocus] element, else the first field, else the dialog),
 * Tab cycles inside, Escape closes, the page behind does not scroll, and
 * focus returns to the element that opened it.
 */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    const opener = document.activeElement as HTMLElement | null;
    dialogStack.push(node);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      if (node.contains(document.activeElement)) return; // an autoFocus field already took it
      const target =
        node.querySelector<HTMLElement>("[data-autofocus]") ??
        node.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])') ??
        node;
      target.focus({ preventScroll: true });
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (dialogStack.at(-1) !== node) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables(node);
      if (!items.length) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === node || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      const i = dialogStack.lastIndexOf(node);
      if (i >= 0) dialogStack.splice(i, 1);
      if (!dialogStack.length) document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return ref;
}

function CloseButton({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <button
      type="button"
      data-close
      onClick={onClose}
      className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-control text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg", className)}
      aria-label="Chiudi"
    >
      <X className="h-5 w-5" aria-hidden />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  /** Accessible name when the dialog has no visible `title`. */
  ariaLabel?: string;
}) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  const descId = useId();
  if (!open || typeof document === "undefined") return null;
  const width = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" }[size];
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "surface-overlay relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-panel outline-none animate-sheet-up sm:rounded-panel sm:animate-pop-in",
          width,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" aria-hidden />
        {title || description ? (
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] py-3 pl-6 pr-3 sm:pt-4">
            <div className="min-w-0 pt-1.5">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em] text-fg">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm text-fg-muted">
                  {description}
                </p>
              )}
            </div>
            <CloseButton onClose={onClose} />
          </div>
        ) : (
          <CloseButton onClose={onClose} className="absolute right-3 top-3 z-10" />
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
        {footer && <div className="border-t border-white/[0.07] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
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
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  side?: "right" | "bottom";
  width?: string;
  tone?: "gold" | "azure";
  headerExtra?: ReactNode;
  ariaLabel?: string;
}) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col border-white/[0.09] bg-ink-850/[0.98] shadow-[0_24px_64px_-24px_rgb(0_0_0/0.9)] outline-none backdrop-blur-xl",
          side === "right"
            ? cn("inset-y-0 right-0 w-full border-l animate-sheet-in", width)
            : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-panel border-t animate-sheet-up",
          tone === "gold" && "border-gold-400/25",
        )}
      >
        {side === "bottom" && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15" aria-hidden />}
        <div className={cn("flex items-center justify-between gap-3 border-b py-2.5 pl-5 pr-3", tone === "gold" ? "border-gold-400/15" : "border-white/[0.07]")}>
          <div id={titleId} className="min-w-0 flex-1">
            {typeof title === "string" ? <h2 className="text-base font-semibold text-fg">{title}</h2> : title}
          </div>
          {headerExtra}
          <CloseButton onClose={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ── Misc ──────────────────────────────────────────────────────

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-white/[0.12] bg-white/[0.05] px-1 font-sans text-[11px] font-medium text-fg-muted", className)}>
      {children}
    </kbd>
  );
}

/** "⌘" on Apple devices, "Ctrl" elsewhere (decided after mount to avoid a hydration mismatch). */
export function useModKey() {
  const [key, setKey] = useState("Ctrl");
  useEffect(() => {
    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
    if (/mac|iphone|ipad|ipod/i.test(platform)) setKey("⌘");
  }, []);
  return key;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-control", className)} aria-hidden />;
}

export function Stat({ label, value, hint, icon, tone = "muted" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-ui text-fg-muted">
        {icon && <span className={cn("[&_svg]:h-3.5 [&_svg]:w-3.5", TONE[tone].text)} aria-hidden>{icon}</span>}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-fg-subtle">{hint}</div>}
    </div>
  );
}
