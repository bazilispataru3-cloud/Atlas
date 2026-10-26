import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** The custom font-size tokens of the design system (globals.css @theme). */
const SIZE_TOKEN = /^(?:[\w-]+:)*text-(?:ui|reading)$/;

/**
 * Same as `cn` (clsx + tailwind-merge), but keeps the custom font sizes `text-ui` and
 * `text-reading`: the default tailwind-merge config reads them as text colours and drops
 * them when a colour class such as `text-fg-muted` is in the same list.
 */
export function cx(...inputs: ClassValue[]): string {
  const list = clsx(inputs).split(/\s+/).filter(Boolean);
  const sizes = list.filter((c) => SIZE_TOKEN.test(c));
  const merged = twMerge(list.filter((c) => !SIZE_TOKEN.test(c)).join(" "));
  return sizes.length ? `${merged} ${sizes.join(" ")}` : merged;
}
