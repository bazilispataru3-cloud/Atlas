import Link from "next/link";
import { Button } from "@/components/ui/primitives";
import { Logo } from "@/components/layout/logo";

/** Any address outside the app: no shell here, so the page brings its own way back. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <header>
        <Link href="/" aria-label="ATLAS STUDY, vai alla dashboard" className="inline-flex rounded-lg">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-12">
        <p className="text-sm text-fg-subtle">Errore 404</p>
        <h1 className="mt-2 font-display text-[2rem] leading-[1.08] tracking-[-0.015em] text-fg sm:text-5xl">Pagina non trovata</h1>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-fg-muted">
          Questo indirizzo non esiste in ATLAS STUDY. Forse il link è cambiato o contiene un errore di battitura.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button href="/" variant="primary">
            Torna alla dashboard
          </Button>
          <Button href="/materie" variant="secondary">
            Apri le materie
          </Button>
          <Button href="/calendario" variant="ghost">
            Calendario
          </Button>
        </div>
      </main>
    </div>
  );
}
