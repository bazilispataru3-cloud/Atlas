import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-lg text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-azure-500/12 text-azure-300">
        <Compass className="h-7 w-7" />
      </span>
      <h1 className="mt-5 font-display text-5xl text-fg">Pagina non trovata</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
        L’indirizzo non corrisponde a nessuna sezione o argomento di ATLAS STUDY. Forse il link è cambiato.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-azure-500 px-4 text-sm font-medium text-white hover:bg-azure-400">
          Torna alla dashboard
        </Link>
        <Link href="/materie" className="inline-flex h-10 items-center rounded-xl border border-white/10 px-4 text-sm text-fg hover:bg-white/[0.05]">
          Le mie materie
        </Link>
      </div>
    </div>
  );
}
