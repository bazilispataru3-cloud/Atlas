import Link from "next/link";
import { BookOpen, CalendarDays, Layers, Library, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/primitives";

const PLACES = [
  { href: "/materie", label: "Le mie materie", hint: "Programma ufficiale, argomento per argomento", icon: BookOpen },
  { href: "/flashcard", label: "Flashcard", hint: "Le carte da ripassare oggi", icon: Layers },
  { href: "/quiz", label: "Quiz e simulazioni", hint: "Allenamento nel formato della prova", icon: Target },
  { href: "/calendario", label: "Calendario", hint: "Il tuo piano fino all’esame", icon: CalendarDays },
  { href: "/biblioteca", label: "Biblioteca", hint: "I tuoi PDF e appunti", icon: Library },
  { href: "/professor", label: "AI Professor", hint: "Fai una domanda su un argomento", icon: Sparkles },
];

/** Inside the app (unknown topic, technique or subject): the shell stays, so the student can keep moving. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-16">
      <p className="text-sm text-fg-subtle">Errore 404</p>
      <h1 className="mt-2 font-display text-[2rem] leading-[1.08] tracking-[-0.015em] text-fg sm:text-5xl">Pagina non trovata</h1>
      <p className="mt-4 max-w-[54ch] text-base leading-relaxed text-fg-muted">
        L’indirizzo non corrisponde a nessuna sezione o argomento di ATLAS STUDY. Forse il link è cambiato o contiene un errore di battitura: puoi cercare l’argomento con la ricerca in alto.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button href="/" variant="primary">
          Torna alla dashboard
        </Button>
        <Button href="/materie" variant="secondary">
          Apri le materie
        </Button>
      </div>

      <nav aria-labelledby="nf-more" className="mt-12 border-t border-white/[0.07] pt-6">
        <h2 id="nf-more" className="text-sm font-medium text-fg-muted">
          Oppure vai a
        </h2>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {PLACES.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="group flex items-start gap-3 rounded-control px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.04]">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-azure-300" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{label}</span>
                  <span className="block text-xs leading-relaxed text-fg-subtle">{hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
