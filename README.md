# ATLAS STUDY

Piattaforma web di studio per il **semestre filtro di Medicina e Chirurgia (a.a. 2026/2027)**: programma ministeriale ufficiale, tre modalità di studio, Study Academy, biblioteca digitale con lettore PDF, flashcard con ripetizione dilazionata, quiz e simulazioni nel formato d’esame, pianificatore, catalogo di corsi universitari verificati e AI Professor.

Interfaccia in italiano, tema scuro, responsive (desktop, tablet, mobile).

---

## Avvio rapido

Requisiti: **Node.js ≥ 20.9**.

```bash
npm install          # copia anche il worker di pdf.js in public/pdfjs
npm run dev          # http://localhost:3000
```

Al primo accesso si può partire da zero o esplorare l’app con **dati dimostrativi** (segnalati in ogni schermata e rimovibili da *Profilo → I tuoi dati*).

Altri comandi:

| Comando | Cosa fa |
|---|---|
| `npm run build` / `npm start` | build e avvio di produzione |
| `npm run typecheck` | controllo TypeScript |
| `npm test` | test automatici (Vitest): SRS, punteggio d’esame, correzione risposte, analisi Feynman, modello di padronanza, pianificatore, integrità di syllabus/quesiti/catalogo |

## Variabili d’ambiente

Copia `.env.example` in `.env.local`. **Tutte le chiavi restano sul server**: il browser riceve solo lo stato (attiva / non configurata) tramite `/api/status`.

| Variabile | A cosa serve | Senza la variabile |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI Professor, correzione Feynman e risposte aperte, generazione di flashcard/quiz/riassunti/mappe dai documenti, ricerca web accademica, traduzione dei titoli | Risposte dalla base di conoscenza ATLAS e analisi locale, **sempre etichettate come tali**; le funzioni di generazione mostrano «AI non configurata» |
| `ATLAS_AI_MODEL` | Modello Claude (predefinito `claude-opus-5-5`) | — |
| `YOUTUBE_API_KEY` | Ricerca live di videolezioni (YouTube Data API v3) | Solo catalogo verificato; nessun risultato simulato |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sincronizzazione cloud (predisposta) | I dati restano nel browser |

## Stato delle funzionalità

| Sezione | Stato |
|---|---|
| **Dashboard** | Funzionante: saluto, ore oggi/settimana (ultimi 7 giorni), padronanza del programma pesata per CFU, argomenti consolidati/da studiare, ripassi e flashcard in scadenza, ultime simulazioni, calendario degli appelli con fonte, suggerimenti dai dati reali, pulsante **INIZIA A STUDIARE** (materia → argomento → modalità) |
| **Le mie materie** | Funzionante: 3 materie, 21 unità, 119 argomenti con testo ufficiale del syllabus; pagina argomento con lezione introduttiva, spiegazione, obiettivi, esempi, diagrammi, mappa, video, flashcard, quiz, *approfondimento avanzato* (separato dal programma ufficiale) e fonti |
| **Study Modes** | Funzionante: Fast, Deep e Ultra con percorsi a step; Ultra adatta il percorso al tipo di argomento (meccanistico, quantitativo, misto); timer che conta solo il tempo effettivo |
| **Study Academy** | Funzionante: 11 tecniche con principi cognitivi, tutorial, illustrazione animata originale, esempio universitario, esercizio interattivo con feedback (Feynman scritto o a voce con secondo tentativo, palazzo della memoria interattivo, …), quando usarla, limiti, fonti con DOI verificati |
| **Biblioteca** | Funzionante: upload di PDF/testo/audio con dichiarazione sui diritti d’uso; lettore PDF con testo selezionabile, evidenziatore a colori, note, segnalibri, ricerca, indice dei capitoli, link alla fonte; strumenti AI con citazione delle pagine. **OCR e trascrizione audio non disponibili** (dichiarato nell’interfaccia) |
| **Flashcard** | Funzionante: mazzi, creazione manuale, mazzi dalle lezioni, generazione AI con revisione prima dell’aggiunta, ripasso SRS (derivato da SM-2, 4 valutazioni), statistiche, previsione delle scadenze, cronologia |
| **Quiz e simulazioni** | Funzionante: quiz personalizzati (risposta multipla a 5 opzioni, completamento, aperte, esercizi di calcolo), spiegazioni, analisi degli errori, simulazione singola o giornata completa con le regole del D.M. 941/2026 |
| **Study Resources** | Funzionante: 72 risorse gratuite e 11 premium verificate (MIT OCW, Yale, OpenStax, Khan Academy, Federica, edX, Coursera…), copertine 16:9, titolo sotto l’immagine, badge FREE/PREMIUM, preferiti, aggiunta al piano, pulsante dorato **$** con pannello premium; ricerca live con YouTube API e ricerca web accademica quando configurate |
| **Calendario** | Funzionante: pianificatore da appello, ore settimanali, giorni liberi, livello e pagine; apprendimento, esercizi, ripassi a 1-3-7-16 giorni, interleaving, simulazioni, pause e riposo; viste settimana/mese/agenda; ricalcolo dal progresso reale |
| **AI Professor** | Implementato con l’API ufficiale (streaming, tre livelli, contesto dell’argomento, documenti della biblioteca con citazione delle pagine); richiede `ANTHROPIC_API_KEY`. Senza chiave usa la base ATLAS, segnalandolo |
| **Profilo e impostazioni** | Funzionante: profilo, preferenze, stato delle integrazioni, esportazione/importazione JSON, rimozione dei dati demo, azzeramento |
| **Sincronizzazione cloud** | **Predisposta, non attiva**: schema e policy RLS in [`supabase/schema.sql`](supabase/schema.sql), non ancora collegati all’app né testati su un progetto reale |

## Fonti ufficiali e onestà dei contenuti

- **Programma**: syllabus MUR del semestre aperto/filtro a.a. 2026-2027 (Biologia, Chimica e propedeutica biochimica, Fisica), notizia MUR del 19/06/2026 con i PDF ufficiali. Il testo degli argomenti è riportato con sole correzioni tipografiche; il raggruppamento in capitoli è editoriale.
- **Regole d’esame**: D.M. n. 941 del 10/07/2026 (31 quesiti per prova: 21 a risposta multipla con 5 opzioni + 10 a completamento; 50 minuti; +1 / 0 / −0,1; sufficienza 18/30; lode con 31).
- **Date**: D.D. n. 249 del 13/07/2026 — 10 dicembre 2026 e 11 gennaio 2027, dalle ore 11:00.
- Tutte le fonti sono state verificate il **19/10/2026** e sono citate nell’app con il link.
- **Quesiti**: 151 quesiti *originali ATLAS* (106 a risposta multipla, 39 a completamento, 6 aperti). Non sono quesiti ministeriali e non vengono presentati come tali.
- **Lezioni complete**: 6 argomenti (mitocondri, replicazione del DNA, soluzioni tampone, osmosi, idrodinamica, radioattività), con fonti e DOI. Per gli altri argomenti l’app lo dichiara («Lezione ATLAS in preparazione») e offre obiettivi ufficiali, risorse, quiz e AI Professor.
- **Risorse**: ogni URL del catalogo è stato aperto e verificato; prezzi riportati solo se letti sulla pagina ufficiale (con data), altrimenti «Prezzo sul sito ufficiale». I risultati live mostrano solo link restituiti dalle API; nessun risultato è simulato. Le copertine senza anteprima ufficiale sono illustrazioni generative originali, etichettate «Illustrazione ATLAS».
- **Padronanza**: la sola lettura non rende un argomento «consolidato»: servono quiz e richiamo attivo (modello in `src/lib/progress.ts`).

ATLAS STUDY è uno strumento indipendente, non affiliato al MUR né agli atenei: in caso di dubbio fanno fede i documenti ufficiali.

## Architettura

```
src/
  app/
    (app)/            pagine (App Router) dentro la shell con sidebar e navigazione mobile
    api/              route server: ai/chat (streaming), ai/generate, ai/evaluate,
                      resources/search, status
  components/         UI per sezione (dashboard, study, subjects, academy, library,
                      flashcards, quiz, calendar, resources, professor, profile, ui)
  data/               syllabus ufficiale, regole d’esame, lezioni, banca quesiti,
                      catalogo risorse, tecniche dell’Academy (dati tipizzati e testati)
  lib/
    server/           codice solo-server: client Anthropic, YouTube, ricerca web,
                      rate limit e cache in memoria (le chiavi non arrivano al browser)
    store.ts          stato dell’utente (Zustand + localStorage)
    library.ts        file e testo dei documenti in IndexedDB, pdf.js, ricerca BM25 (RAG)
    srs.ts planner.ts progress.ts feynman.ts   logica pura, coperta da test
supabase/schema.sql   schema e Row Level Security per la sincronizzazione (predisposto)
```

- **Stack**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, Zustand, Zod, pdf.js (build *legacy* per compatibilità con i browser attuali), Anthropic SDK.
- **AI**: output strutturati validati con Zod, prompt di sistema con regole di affidabilità (fonti solo dal contesto, distinzione fatti/interpretazioni, citazione delle pagine), ricerca web limitata a domini accademici, gestione di errori, rate limit e fallback.
- **Sicurezza**: chiavi solo lato server, header di sicurezza (`next.config.ts`), PDF aperti con XFA disattivato, input delle API validati, nessun tracciamento.
- **Accessibilità** (riferimento WCAG 2.2 AA): navigazione da tastiera con focus sempre visibile, dialoghi con focus trap e ritorno del focus, etichette ARIA, contrasti verificati per ogni token di testo e per i bordi dei controlli, tabelle alternative e lettura da tastiera dei grafici, palette delle materie verificata per il daltonismo, opzione «Riduci le animazioni» e rispetto di `prefers-reduced-motion`.

## Design system

- **Token** in `src/app/globals.css` (`@theme` di Tailwind 4): superfici onice e antracite, testo `fg` / `fg-reading` / `fg-muted` / `fg-subtle` (tutti ≥ 4,5:1 su ogni superficie), **blu elettrico** per le funzioni di studio e le risorse gratuite, **oro luminoso** solo per il premium, arancione per gli avvisi, raggi per ruolo (`chip`, `control`, `card`, `panel`), easing e animazioni condivise.
- **Tipografia**: Newsreader per i titoli, IBM Plex Sans per l’interfaccia e il testo, IBM Plex Mono solo per formule e codice; testo di lettura a 17 px, interlinea 1,7, righe di circa 68 caratteri.
- **Elemento firma**: il «meridiano», una linea sottile in blu elettrico che segna il percorso di studio (piano di oggi, passi della sessione, avanzamento).
- **Componenti condivisi** in `src/components/ui/`: pulsanti con stato di caricamento, card per ruolo, Tabs e Segmented con frecce da tastiera, Modal e Sheet accessibili, toast con azione, grafici SVG responsivi; shell in `src/components/layout/` con modalità focus per esami e ripassi.
- **Immagini scientifiche** in `public/images/science/`, catalogate in `src/data/imagery.ts` con autore, licenza (pubblico dominio, CC BY, CC BY-SA) e pagina di origine; il componente `ScienceFigure` mostra sempre i crediti.

## Privacy

Progressi, flashcard, piani e conversazioni sono salvati nel browser (localStorage); i file della biblioteca in IndexedDB. Nulla viene inviato a server esterni senza un’azione esplicita: le funzioni AI inviano al servizio configurato solo il testo necessario a quella richiesta. L’esportazione JSON permette di spostare i dati su un altro dispositivo.

## Limiti noti

- OCR dei PDF scansionati e trascrizione dell’audio non disponibili.
- Sincronizzazione cloud e autenticazione non ancora attive (schema pronto).
- Lezioni complete per 6 argomenti su 119; banca di 151 quesiti (ripetendo molte simulazioni le domande si ripetono).
- Le integrazioni con chiave (AI Professor e generazione, ricerca YouTube, ricerca web accademica) sono implementate con le API ufficiali ma, durante lo sviluppo, sono state verificate solo nel comportamento senza chiavi (stato «non configurata» e fallback dichiarati): vanno provate con chiavi reali prima della messa in produzione.
