"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAtlas } from "./store";
import { useUI } from "./ui-store";
import { computeMastery, statusOf, type TopicStatus } from "./progress";
import { allTopicRefs } from "@/data/syllabus";
import { isDue } from "./srs";
import type { SubjectId, TopicRef } from "./types";

/** True once the persisted store has been read from localStorage (client only). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useAtlas.persist.onFinishHydration(cb),
    () => useAtlas.persist.hasHydrated(),
    () => false,
  );
}

/** Re-renders every `ms` milliseconds; used for clocks and countdowns. */
export function useNow(ms = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export interface TopicState {
  ref: TopicRef;
  mastery: number;
  status: TopicStatus;
}

/** Card retention per topic computed from the last reviews (Good/Easy = retained). */
export function useCardRetentionByTopic(): Map<string, number> {
  const cards = useAtlas((s) => s.cards);
  const reviews = useAtlas((s) => s.cardReviews);
  return useMemo(() => {
    const topicOf = new Map(cards.map((c) => [c.id, c.topicId]));
    const agg = new Map<string, { ok: number; n: number }>();
    for (const r of reviews.slice(-600)) {
      const t = topicOf.get(r.cardId);
      if (!t) continue;
      const a = agg.get(t) ?? { ok: 0, n: 0 };
      a.n += 1;
      if (r.rating >= 3) a.ok += 1;
      agg.set(t, a);
    }
    return new Map([...agg].map(([k, v]) => [k, v.ok / v.n]));
  }, [cards, reviews]);
}

export function useTopicStates(subject?: SubjectId): TopicState[] {
  const progress = useAtlas((s) => s.progress);
  const retention = useCardRetentionByTopic();
  return useMemo(() => {
    const now = new Date();
    return allTopicRefs()
      .filter((r) => !subject || r.subject.id === subject)
      .map((ref) => {
        const p = progress[ref.topic.id];
        const mastery = computeMastery(p, retention.get(ref.topic.id) ?? null, now);
        return { ref, mastery, status: statusOf(p, mastery) };
      });
  }, [progress, retention, subject]);
}

export function useDueCards() {
  const cards = useAtlas((s) => s.cards);
  const now = useNow(60_000);
  return useMemo(() => cards.filter((c) => !c.suspended && isDue(c.srs, now)), [cards, now]);
}

/** True when motion should be minimal: the OS setting or the in-app "Riduci animazioni" switch. */
export function useReducedMotion(): boolean {
  const setting = useAtlas((s) => s.settings.reduceMotion);
  const media = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  return setting || media;
}

/**
 * Focus mode while `active`: the shell hides the sidebar, the top bar and the
 * tab bar (the page renders its own minimal header with an exit). Cleared on unmount.
 */
export function useFocusMode(active: boolean) {
  const setFocusMode = useUI((s) => s.setFocusMode);
  useEffect(() => {
    setFocusMode(active);
    return () => setFocusMode(false);
  }, [active, setFocusMode]);
}

/** Asks the browser to confirm before reloading or closing the tab while `active` (e.g. an exam in progress). */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);
}
