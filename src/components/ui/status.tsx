import type { TopicStatus } from "@/lib/progress";
import { STATUS_LABEL } from "@/lib/progress";
import { Badge } from "./primitives";
import type { Tone } from "./tone";

export const STATUS_TONE: Record<TopicStatus, Tone> = {
  nuovo: "muted",
  "in-corso": "azure",
  "da-consolidare": "warning",
  consolidato: "success",
};

/** Solid fill per status for compact strips (kept in sync with the dashboard). */
export const STATUS_FILL: Record<TopicStatus, string> = {
  nuovo: "bg-white/[0.07]",
  "in-corso": "bg-azure-400/70",
  "da-consolidare": "bg-amber-400/70",
  consolidato: "bg-emerald-400/80",
};

export function StatusBadge({ status, className }: { status: TopicStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
