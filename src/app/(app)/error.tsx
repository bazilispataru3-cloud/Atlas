"use client";

import { useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center" role="alert">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-danger/30 bg-danger/[0.08] text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-3xl text-fg">Questa pagina non si è caricata</h1>
      <p className="mt-3 text-base leading-relaxed text-fg-muted">
        Si è verificato un errore imprevisto. I tuoi progressi sono salvati nel browser e non sono stati toccati: riprova, oppure torna alla dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Riprova
        </Button>
        <Button variant="secondary" href="/">
          Vai alla dashboard
        </Button>
      </div>
      {error.digest && <p className="mt-6 text-xs text-fg-subtle">Codice errore: {error.digest}</p>}
    </div>
  );
}
