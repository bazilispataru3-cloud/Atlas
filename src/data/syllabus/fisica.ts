import type { Subject } from "@/lib/types";
import { topic } from "./helpers";

// Fonte: MUR, "Syllabus semestre filtro — Insegnamento di Fisica", versione 2026
// (notizia MUR del 19/06/2026). Per ogni unità il syllabus indica la quota minima
// di impegno dedicata alle esercitazioni (campo exerciseShare). Capitoli editoriali.

export const fisica: Subject = {
  id: "fisica",
  name: "Fisica",
  shortName: "Fis",
  cfu: 6,
  tagline: "Leggi quantitative per leggere il corpo umano: forze, fluidi, energia, campi e radiazioni.",
  generalObjective:
    "Fornire le conoscenze essenziali di fisica, utili per comprendere i fenomeni naturali e i processi biologici, con particolare attenzione alle applicazioni in area biomedica.",
  units: [
    {
      id: "fis-u1",
      number: 1,
      title: "Introduzione ai metodi della fisica",
      cfu: 0.2,
      exerciseShare: 0.2,
      officialLead:
        "Interpretare elementi di base di matematica e fisica (grafici e formule). Risolvere operazioni tra vettori; eseguire conversioni tra unità di misura",
      chapters: [
        {
          id: "fis-u1-c1",
          title: "Grandezze, unità e vettori",
          topics: [
            topic("fis-notazione", "Notazione scientifica", "Notazione scientifica."),
            topic(
              "fis-grandezze",
              "Grandezze fisiche, dimensioni e unità SI",
              "Grandezze fisiche, dimensione ed unità di misura, Sistema Internazionale delle unità di misura: Conversioni tra unità di misura e stima ordine di grandezza. Grandezze estensive ed intensive. Grandezze scalari e vettoriali.",
              { keywords: ["SI", "unità di misura", "conversioni", "ordine di grandezza"] },
            ),
            topic("fis-trigonometria", "Funzioni trigonometriche elementari", "Funzioni trigonometriche elementari."),
            topic(
              "fis-vettori",
              "Vettori e operazioni",
              "Vettori: definizione, componenti, operazioni (esempi: somma, differenza, prodotto scalare e prodotto vettoriale).",
              { keywords: ["vettori", "prodotto scalare", "prodotto vettoriale"] },
            ),
          ],
        },
      ],
    },
    {
      id: "fis-u2",
      number: 2,
      title: "Meccanica",
      cfu: 1.4,
      exerciseShare: 0.25,
      officialLead:
        "Descrivere e interpretare elementi di meccanica. Risolvere problemi ed esercizi numerici relativi alla meccanica",
      chapters: [
        {
          id: "fis-u2-c1",
          title: "Cinematica e dinamica",
          topics: [
            topic(
              "fis-cinematica",
              "Cinematica del punto materiale",
              "Cinematica del punto materiale: definizione di posizione e spostamento nel tempo. Concetto di traiettoria e legge oraria. Velocità media e velocità istantanea, accelerazione media e accelerazione istantanea. Studio dei moti rettilinei e curvilinei, con esempi significativi: moto rettilineo uniforme, moto uniformemente accelerato, caduta libera, moto parabolico. Moto circolare uniforme e accelerazione centripeta.",
              { keywords: ["cinematica", "velocità", "accelerazione", "moto parabolico", "caduta libera"] },
            ),
            topic(
              "fis-dinamica",
              "Dinamica: i tre principi e le forze",
              "Dinamica del punto materiale: analisi delle interazioni tra corpi e formulazione dei tre principi della dinamica. Significato fisico del principio di inerzia e condizioni per l’equilibrio statico (prima legge). Legame tra forza risultante e accelerazione (seconda legge). Azione e reazione tra corpi in interazione (terza legge). Applicazione ai concetti di equilibrio traslazionale. Definizione di forza e principali esempi: forza peso, forza gravitazionale, forze di contatto e forza di attrito (statico e dinamico), tensione, forze elastiche e legge di Hooke per molle ideali.",
              { keywords: ["Newton", "forza", "attrito", "Hooke", "dinamica"] },
            ),
          ],
        },
        {
          id: "fis-u2-c2",
          title: "Energia, quantità di moto e corpo rigido",
          topics: [
            topic(
              "fis-lavoro-energia",
              "Lavoro, potenza ed energia meccanica",
              "Lavoro ed energia: concetto di lavoro meccanico come effetto di una forza applicata su un corpo. Definizione di potenza e relazione con il lavoro svolto in un intervallo di tempo. Teorema dell’energia cinetica. Lavoro e confronto tra forze conservative e forze non conservative. Definizione di energia potenziale. Esempi: energia potenziale gravitazionale ed energia potenziale elastica. Energia meccanica come somma di energia cinetica ed energia potenziale. Teorema di conservazione dell’energia meccanica nei sistemi ideali.",
              { keywords: ["lavoro", "energia cinetica", "potenza", "energia potenziale"] },
            ),
            topic(
              "fis-quantita-moto",
              "Quantità di moto e impulso",
              "Quantità di moto: introduzione al concetto di quantità di moto e di impulso. Principio di conservazione della quantità di moto nei sistemi isolati.",
            ),
            topic(
              "fis-corpo-rigido",
              "Centro di massa, momento torcente e leve",
              "Sistemi di corpi: definizione di centro di massa e descrizione del suo moto. Caratteristiche del corpo rigido. Momento torcente e condizioni per l’equilibrio rotazionale. Leve nel corpo umano.",
              { keywords: ["leve", "momento torcente", "centro di massa"] },
            ),
          ],
        },
      ],
    },
    {
      id: "fis-u3",
      number: 3,
      title: "Meccanica dei fluidi",
      cfu: 1.2,
      exerciseShare: 0.25,
      officialLead:
        "Descrivere e interpretare elementi di meccanica dei fluidi. Correlare i principi della fluidodinamica con i flussi, resistenze e pressioni fisiologiche nei sistemi biologici. Risolvere problemi ed esercizi numerici relativi alla meccanica dei fluidi",
      chapters: [
        {
          id: "fis-u3-c1",
          title: "Statica dei fluidi",
          topics: [
            topic(
              "fis-pressione-densita",
              "Fluidi, pressione e densità",
              "Stati di aggregazione della materia: caratteristiche fondamentali dei fluidi rispetto ai solidi. Definizione di pressione e densità e loro ruolo nel comportamento statico e dinamico dei fluidi.",
            ),
            topic(
              "fis-idrostatica",
              "Stevino, Pascal, Archimede e misura della pressione",
              "Leggi dell’idrostatica: legge di Stevino per la pressione nei liquidi in funzione della profondità; principio di Pascal per la trasmissione della pressione nei fluidi incomprimibili; principio di Archimede per la spinta che un fluido esercita su un corpo immerso. Analisi delle condizioni di galleggiamento. Strumenti e metodi per la misura della pressione (esperimento di Torricelli, manometro).",
              { keywords: ["Stevino", "Pascal", "Archimede", "Torricelli", "manometro"] },
            ),
          ],
        },
        {
          id: "fis-u3-c2",
          title: "Dinamica dei fluidi e fenomeni di superficie",
          topics: [
            topic(
              "fis-idrodinamica",
              "Idrodinamica: portata, continuità e Bernoulli",
              "Fluidi in movimento (idrodinamica): concetti di flusso e portata, distinzione tra moto stazionario e turbolento, con attenzione particolare al moto laminare. Equazione di continuità e conservazione della massa nei fluidi ideali. Teorema di Bernoulli e applicazioni alla circolazione sanguigna (stenosi e aneurisma).",
              { hasLesson: true, keywords: ["Bernoulli", "portata", "continuità", "stenosi", "aneurisma", "idrodinamica"] },
            ),
            topic(
              "fis-viscosita",
              "Fluidi reali, viscosità e legge di Poiseuille",
              "Fluidi reali e viscosità: analisi del moto laminare, profilo parabolico della velocità, concetto di gradiente di velocità. Legge di Poiseuille e resistenze idrauliche in serie e in parallelo.",
              { keywords: ["viscosità", "Poiseuille", "resistenza idraulica"] },
            ),
            topic(
              "fis-superficie",
              "Tensione superficiale, capillarità e legge di Laplace",
              "Fenomeni di superficie: tensione superficiale e suoi effetti su piccole quantità di liquido. Fenomeni di capillarità e comportamento delle interfacce fluide, sia piane che curve. Pressione di curvatura e sua descrizione qualitativa mediante la legge di Laplace.",
              { keywords: ["tensione superficiale", "capillarità", "Laplace"] },
            ),
          ],
        },
      ],
    },
    {
      id: "fis-u4",
      number: 4,
      title: "Onde meccaniche",
      cfu: 0.4,
      exerciseShare: 0.2,
      officialLead:
        "Descrivere ed interpretare elementi di onde meccaniche. Correlare i fenomeni ondulatori in ambito acustico. Risolvere problemi ed esercizi numerici relativi alle onde meccaniche",
      chapters: [
        {
          id: "fis-u4-c1",
          title: "Onde e acustica",
          topics: [
            topic(
              "fis-onde",
              "Onde meccaniche e oscillatore armonico",
              "Onde meccaniche: introduzione alla natura delle onde meccaniche come fenomeni di propagazione di energia e perturbazione attraverso un mezzo materiale. Concetto di oscillatore armonico come modello base di generazione di onde. Definizione di frequenza, periodo, pulsazione e lunghezza d’onda. Velocità di propagazione delle onde e relazione tra i parametri ondulatori. Equazione di propagazione per onde armoniche semplici. Esempi di onde monodimensionali: onde trasversali su una corda e onde longitudinali, come quelle sonore nei fluidi.",
              { keywords: ["onde", "frequenza", "lunghezza d'onda", "oscillatore armonico"] },
            ),
            topic("fis-interferenza", "Sovrapposizione e interferenza", "Principi di sovrapposizione e interferenza."),
            topic(
              "fis-intensita",
              "Energia, potenza e intensità delle onde",
              "Energia trasportata dalle onde: concetto di energia associata a un’onda meccanica. Potenza trasportata da un’onda in un mezzo elastico. Intensità dell’onda come quantità fisica misurabile, legata all’energia trasportata per unità di area e di tempo. Legge dell’inverso del quadrato della distanza.",
            ),
            topic(
              "fis-acustica",
              "Onde acustiche, decibel ed effetto Doppler",
              "Onde acustiche: propagazione del suono nei diversi mezzi materiali, con particolare attenzione alla velocità del suono. Relazione tra intensità acustica e percezione sonora. Definizione di livello di intensità sonora in decibel. Effetto Doppler: descrizione qualitativa.",
              { keywords: ["suono", "decibel", "Doppler"] },
            ),
          ],
        },
      ],
    },
    {
      id: "fis-u5",
      number: 5,
      title: "Termodinamica",
      cfu: 1,
      exerciseShare: 0.3,
      officialLead:
        "Descrivere ed interpretare elementi di termodinamica. Risolvere problemi ed esercizi numerici relativi alla termodinamica",
      chapters: [
        {
          id: "fis-u5-c1",
          title: "Calore e temperatura",
          topics: [
            topic(
              "fis-termo-concetti",
              "Sistemi, variabili di stato e gas perfetti",
              "Concetti fondamentali: definizione di sistema e ambiente. Variabili termodinamiche (pressione, volume, temperatura) e stato termodinamico. Funzioni di stato. Temperatura e sue scale di misura. Gas perfetti ed equazione di stato.",
            ),
            topic(
              "fis-calore",
              "Calore, capacità termica e calorimetria",
              "Calore e capacità termica: scambi di energia sotto forma di calore. Definizione di capacità termica e calore specifico, con riferimento ai gas ideali. Fenomeni di cambiamento di stato fisico (fusione, evaporazione, condensazione), calore latente. Calorimetria.",
              { keywords: ["calore specifico", "calore latente", "calorimetria"] },
            ),
            topic(
              "fis-trasmissione-calore",
              "Conduzione, convezione e irraggiamento",
              "Meccanismi di trasmissione del calore: conduzione termica, convezione e irraggiamento.",
            ),
          ],
        },
        {
          id: "fis-u5-c2",
          title: "Principi della termodinamica",
          topics: [
            topic(
              "fis-primo-principio",
              "Primo principio e trasformazioni dei gas ideali",
              "Primo principio della termodinamica: definizione e significato fisico. Energia interna, calore e lavoro. Applicazione del primo principio alle trasformazioni termodinamiche. Trasformazioni reversibili e irreversibili. Trasformazioni canoniche nei gas ideali: isoterma, isocora, isobara, adiabatica, con confronto qualitativo dei comportamenti.",
              { keywords: ["primo principio", "energia interna", "isoterma", "adiabatica"] },
            ),
            topic(
              "fis-secondo-principio",
              "Secondo principio, macchine termiche ed entropia",
              "Secondo principio della termodinamica: enunciati fondamentali e concetto di irreversibilità. Cicli termodinamici: definizione e funzionamento. Macchine termiche, rendimento, ciclo di Carnot. Entropia come funzione di stato, implicazioni macroscopiche e interpretazione statistica. Legame tra variazione dell’entropia e direzione naturale dei processi termodinamici.",
              { keywords: ["entropia", "Carnot", "rendimento", "secondo principio"] },
            ),
          ],
        },
      ],
    },
    {
      id: "fis-u6",
      number: 6,
      title: "Elettricità e magnetismo",
      cfu: 1.2,
      exerciseShare: 0.3,
      officialLead:
        "Descrivere e interpretare elementi di elettricità e magnetismo. Comprendere i fenomeni elettrici e magnetici. Risolvere problemi ed esercizi numerici relativi agli elementi di elettricità e magnetismo",
      chapters: [
        {
          id: "fis-u6-c1",
          title: "Elettrostatica",
          topics: [
            topic(
              "fis-coulomb",
              "Carica elettrica, legge di Coulomb e campo elettrico",
              "Carica elettrica e interazioni: proprietà fondamentali della carica elettrica, unità di misura, conservazione della carica. Interazione tra cariche puntiformi e legge di Coulomb. Definizione di campo elettrico e rappresentazione tramite linee di forza. Campo generato da una carica puntiforme o da una distribuzione di più cariche puntiformi. Moto di una carica in un campo elettrico uniforme.",
              { keywords: ["Coulomb", "campo elettrico", "carica"] },
            ),
            topic(
              "fis-potenziale",
              "Energia e potenziale elettrico",
              "Energia e potenziale elettrico: energia potenziale associata a una distribuzione di cariche. Definizione di potenziale elettrico e differenza di potenziale. Conservazione dell’energia per una carica in movimento in un campo elettrico.",
            ),
            topic(
              "fis-conduttori",
              "Conduttori e dielettrici",
              "Conduttori e dielettrici (isolanti): descrizione qualitativa dei fenomeni di induzione elettrostatica e di polarizzazione.",
            ),
            topic(
              "fis-condensatori",
              "Capacità e condensatori",
              "Capacità e condensatori: concetto di capacità elettrica. Capacità del condensatore piano, effetto della presenza di un dielettrico. Energia immagazzinata in un condensatore carico. Collegamenti di condensatori in serie e in parallelo.",
              { keywords: ["condensatore", "capacità", "dielettrico"] },
            ),
          ],
        },
        {
          id: "fis-u6-c2",
          title: "Correnti e magnetismo",
          topics: [
            topic(
              "fis-corrente",
              "Corrente elettrica, leggi di Ohm ed effetto Joule",
              "Corrente elettrica: corrente continua, intensità di corrente, generatore elettrico ideale e differenza di potenziale applicata. Conduzione nei conduttori ohmici. Leggi di Ohm, resistenza e resistività dei materiali. Potenza elettrica dissipata per effetto Joule. Combinazione di resistenze in serie e in parallelo.",
              { keywords: ["Ohm", "resistenza", "Joule", "corrente"] },
            ),
            topic(
              "fis-magnetismo",
              "Campo magnetico e forza di Lorentz",
              "Campo magnetico: origine del campo magnetico dalle correnti elettriche (Esperimento di Oersted). Forza di Lorentz su una carica in moto e su un filo percorso da corrente. Moto circolare di una carica elettrica in un campo magnetico uniforme.",
              { keywords: ["Lorentz", "campo magnetico", "Oersted"] },
            ),
            topic(
              "fis-induzione",
              "Induzione elettromagnetica",
              "Induzione elettromagnetica: variazione del flusso magnetico e generazione di forza elettromotrice. Legge di Faraday-Neumann-Lenz. Correnti indotte e loro verso.",
            ),
          ],
        },
      ],
    },
    {
      id: "fis-u7",
      number: 7,
      title: "Fisica delle radiazioni",
      cfu: 0.6,
      exerciseShare: 0.2,
      officialLead:
        "Descrivere e interpretare la fisica delle radiazioni e comprenderne gli effetti. Risolvere problemi ed esercizi numerici relativi alla fisica delle radiazioni",
      chapters: [
        {
          id: "fis-u7-c1",
          title: "Radiazione elettromagnetica e ottica",
          topics: [
            topic(
              "fis-onde-em",
              "Onde elettromagnetiche e spettro",
              "Radiazione elettromagnetica: natura ondulatoria delle onde elettromagnetiche come combinazione di campi elettrici e magnetici oscillanti perpendicolari tra loro; caratteristiche fondamentali (lunghezza d’onda, frequenza, velocità di propagazione, ampiezza e intensità dell’onda). Spettro della radiazione elettromagnetica: suddivisione dello spettro in regioni (onde radio, microonde, infrarosso, luce visibile, ultravioletto, raggi X, raggi gamma), ordine crescente di frequenza e decrescente di lunghezza d’onda.",
              { keywords: ["onde elettromagnetiche", "spettro", "raggi X"] },
            ),
            topic(
              "fis-fotoni",
              "Fotoni, assorbimento e legge di Lambert-Beer",
              "Quantizzazione dell’energia: concetto di fotone come quanto di energia associato alla radiazione; relazione tra energia del fotone e frequenza. Assorbimento della radiazione elettromagnetica (legge di Lambert-Beer).",
              { keywords: ["fotone", "Planck", "Lambert-Beer"] },
            ),
            topic(
              "fis-ottica",
              "Ottica: riflessione, rifrazione e lenti sottili",
              "Ottica: leggi della riflessione e della rifrazione della luce, concetto di indice di rifrazione. Legge dei punti coniugati per le lenti convergenti sottili e formazione delle immagini.",
              { keywords: ["rifrazione", "Snell", "lenti", "punti coniugati"] },
            ),
          ],
        },
        {
          id: "fis-u7-c2",
          title: "Radioattività e radiazioni ionizzanti",
          topics: [
            topic(
              "fis-radioattivita",
              "Radioattività, decadimento ed emivita",
              "Radioattività e decadimenti radioattivi: definizione di nucleo instabile, concetto di isotopi radioattivi. Attività e legge del decadimento radioattivo, emivita. Tipi principali di decadimento (alfa, beta, gamma) e trasformazioni nucleari associate.",
              { hasLesson: true, keywords: ["radioattività", "emivita", "decadimento", "alfa", "beta", "gamma", "attività"] },
            ),
            topic(
              "fis-ionizzanti",
              "Radiazioni ionizzanti e non ionizzanti",
              "Radiazioni elettromagnetiche ionizzanti e non ionizzanti: distinzione basata sull’energia trasportata dalla radiazione rispetto all’energia di ionizzazione degli atomi. Esempi di radiazioni non ionizzanti (onde radio, microonde, infrarosso) e ionizzanti (raggi X, raggi gamma).",
            ),
          ],
        },
      ],
    },
  ],
};
