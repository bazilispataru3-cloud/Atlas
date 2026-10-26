"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button, Modal, Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { fmt, pluralize } from "@/lib/utils";
import { ProfessorChat } from "./chat";

const cx = clsx;

/**
 * Full-page AI Professor: the conversation takes the width (a reading column
 * centred in it); past conversations sit in a narrow list from `lg`, and in
 * the history menu of the chat header below it.
 */
export function ProfessorPage() {
  const hydrated = useHydrated();
  const chats = useAtlas((s) => s.chats);
  const deleteChat = useAtlas((s) => s.deleteChat);
  const [active, setActive] = useState<string | null>(null);
  const [session, setSession] = useState(0); // remounts the chat when switching threads
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  const threads = hydrated
    ? [...chats].sort((a, b) => (b.messages.at(-1)?.createdAt ?? b.createdAt).localeCompare(a.messages.at(-1)?.createdAt ?? a.createdAt))
    : [];
  const open = (id: string | null) => {
    setActive(id);
    setSession((n) => n + 1);
  };

  return (
    <div className="-mb-6 grid h-[calc(100dvh-10rem-env(safe-area-inset-bottom))] min-h-[28rem] grid-rows-[minmax(0,1fr)] gap-6 lg:-mb-8 lg:h-[calc(100dvh-7.5rem)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden min-h-0 flex-col lg:flex" aria-labelledby="prof-threads">
        <Button variant="secondary" onClick={() => open(null)} className="w-full justify-start">
          <Plus className="h-4 w-4" aria-hidden /> Nuova conversazione
        </Button>
        <h2 id="prof-threads" className="mt-6 px-2 text-xs font-medium text-fg-subtle">
          Conversazioni recenti
        </h2>
        {!hydrated ? (
          <div className="mt-2 space-y-2 px-2" aria-hidden>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : threads.length === 0 ? (
          <p className="mt-2 px-2 text-sm leading-relaxed text-fg-muted">Ancora nessuna. Le domande che fai restano salvate in questo browser.</p>
        ) : (
          <ul className="mt-1.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
            {threads.map((t) => {
              const current = active === t.id;
              return (
                <li key={t.id} className={cx("group flex items-center rounded-control transition-colors duration-150", current ? "bg-white/[0.07]" : "hover:bg-white/[0.04]")}>
                  <button type="button" onClick={() => open(t.id)} aria-current={current ? "true" : undefined} className="min-w-0 flex-1 rounded-control px-2.5 py-2 text-left">
                    <span className={cx("block truncate text-sm", current ? "font-medium text-fg" : "text-fg-muted group-hover:text-fg")}>{t.title}</span>
                    <span className="mt-0.5 block text-xs text-fg-subtle">
                      {fmt.dateShort(t.messages.at(-1)?.createdAt ?? t.createdAt)}, {pluralize(t.messages.length, "messaggio", "messaggi")}
                    </span>
                  </button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setToDelete({ id: t.id, title: t.title })}
                    className="mr-1 shrink-0 opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                    aria-label={`Elimina la conversazione «${t.title}»`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 px-2 text-xs text-fg-subtle">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Salvate solo in questo browser.
        </p>
      </aside>

      <section aria-label="Chat con l’AI Professor" className="flex min-h-0 flex-col sm:rounded-panel sm:border sm:border-white/[0.07] sm:bg-ink-900/50">
        {hydrated ? (
          <ProfessorChat key={session} initialThreadId={active} onThreadChange={setActive} title="AI Professor" hideHistory="lg" />
        ) : (
          <div className="flex h-full flex-col gap-4 p-4" aria-busy="true">
            <h1 className="font-display text-2xl text-fg">AI Professor</h1>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="mt-auto h-12 w-full" />
          </div>
        )}
      </section>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        size="sm"
        title="Eliminare la conversazione?"
        description={toDelete ? `«${toDelete.title}» verrà rimossa da questo browser. Non si può annullare.` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Annulla
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!toDelete) return;
                deleteChat(toDelete.id);
                if (active === toDelete.id) open(null);
                setToDelete(null);
                toast("Conversazione eliminata", { tone: "info" });
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Elimina
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">Le altre conversazioni e i tuoi progressi non cambiano.</p>
      </Modal>
    </div>
  );
}
