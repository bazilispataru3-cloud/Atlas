"use client";

import { useEffect, useId, useState } from "react";
import type { SubjectId } from "@/lib/types";
import { SUBJECTS } from "@/data/syllabus";
import { Button, Input, Label, Modal, Segmented, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas, type LibraryDoc } from "@/lib/store";
import { patchDocMeta, type DocMeta } from "@/lib/library";
import { docType } from "./shared";

/** Rename a document, change its subject and type, link the original source. */
export function DocDetailsModal({
  doc,
  meta,
  open,
  onClose,
  onMeta,
}: {
  doc: LibraryDoc | null;
  meta?: DocMeta;
  open: boolean;
  onClose: () => void;
  onMeta?: (id: string, m: DocMeta) => void;
}) {
  const updateDoc = useAtlas((s) => s.updateDoc);
  const ids = useId();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState<SubjectId | "">("");
  const [category, setCategory] = useState<"sbobina" | "appunti">("appunti");
  const [src, setSrc] = useState("");
  const [errors, setErrors] = useState<{ name?: string; src?: string }>({});

  useEffect(() => {
    if (!open || !doc) return;
    setName(doc.name);
    setSubject(doc.subject ?? "");
    const t = docType(doc, meta);
    setCategory(t === "sbobina" ? "sbobina" : "appunti");
    setSrc(doc.sourceUrl ?? "");
    setErrors({});
  }, [open, doc, meta]);

  if (!doc) return null;

  const save = async () => {
    const n = name.trim();
    const s = src.trim();
    const errs: typeof errors = {};
    if (!n) errs.name = "Scrivi un nome per riconoscere il documento.";
    if (s && !/^https?:\/\/\S+\.\S+/i.test(s)) errs.src = "Inserisci un indirizzo completo che inizi con https://";
    setErrors(errs);
    if (errs.name) return document.getElementById(`${ids}-name`)?.focus();
    if (errs.src) return document.getElementById(`${ids}-src`)?.focus();
    updateDoc(doc.id, { name: n, subject: subject || undefined, sourceUrl: s || undefined });
    if (doc.kind === "testo") {
      const m = await patchDocMeta(doc.id, (x) => ({ ...x, category }));
      onMeta?.(doc.id, m);
    }
    toast("Modifiche salvate");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Dettagli del documento"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button variant="primary" type="submit" form={`${ids}-form`}>Salva</Button>
        </div>
      }
    >
      <form
        id={`${ids}-form`}
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        <div>
          <Label htmlFor={`${ids}-name`}>Nome</Label>
          <Input
            id={`${ids}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? `${ids}-name-err` : undefined}
            maxLength={160}
          />
          {errors.name && <p id={`${ids}-name-err`} className="mt-1.5 text-sm text-orange-300">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor={`${ids}-subject`}>Materia</Label>
          <Select id={`${ids}-subject`} value={subject} onChange={(e) => setSubject(e.target.value as SubjectId | "")}>
            <option value="">Nessuna materia</option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        {doc.kind === "testo" && (
          <div>
            <div id={`${ids}-type`} className="mb-1.5 text-ui font-medium text-fg-muted">Tipo di testo</div>
            <Segmented
              ariaLabel="Tipo di testo"
              value={category}
              onChange={setCategory}
              options={[
                { value: "sbobina", label: "Sbobina di lezione" },
                { value: "appunti", label: "Appunti" },
              ]}
            />
          </div>
        )}
        <div>
          <Label htmlFor={`${ids}-src`}>Fonte originale (facoltativa)</Label>
          <Input
            id={`${ids}-src`}
            type="url"
            inputMode="url"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="https://pagina del corso, del docente o dell’editore"
            aria-invalid={!!errors.src || undefined}
            aria-describedby={`${ids}-src-hint${errors.src ? ` ${ids}-src-err` : ""}`}
          />
          <p id={`${ids}-src-hint`} className="mt-1.5 text-xs text-fg-subtle">Comparirà nel lettore come collegamento alla fonte.</p>
          {errors.src && <p id={`${ids}-src-err`} className="mt-1 text-sm text-orange-300">{errors.src}</p>}
        </div>
      </form>
    </Modal>
  );
}
