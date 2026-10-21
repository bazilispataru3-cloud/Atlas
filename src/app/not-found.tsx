import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-5xl text-fg">Pagina non trovata</h1>
        <p className="mt-3 text-fg-muted">L’indirizzo non esiste in ATLAS STUDY.</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-azure-500 px-4 text-sm font-medium text-white hover:bg-azure-400">
          Torna alla dashboard
        </Link>
      </div>
    </div>
  );
}
