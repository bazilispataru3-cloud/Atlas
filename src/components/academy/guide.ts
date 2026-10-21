import { TECHNIQUES, type Technique } from "@/data/academy";

/**
 * Study Academy guide data: how the techniques are grouped by the student's
 * goal, the recommended order, the "Prova tu" check for every step of every
 * tutorial and the title of each full exercise.
 */

export interface AcademyGroup {
  id: "ricordare" | "capire" | "organizzare" | "esame";
  label: string;
  title: string;
  description: string;
  ids: string[];
}

export const ACADEMY_GROUPS: AcademyGroup[] = [
  {
    id: "ricordare",
    label: "Ricordare",
    title: "Per ricordare",
    description: "Fissare definizioni, dati e sequenze fino al giorno dell’esame.",
    ids: ["active-recall", "spaced-repetition", "palazzo-memoria"],
  },
  {
    id: "capire",
    label: "Capire",
    title: "Per capire",
    description: "Quando un argomento ti sembra chiaro ma non riesci a spiegarlo.",
    ids: ["feynman", "elaborazione", "auto-spiegazione", "dual-coding"],
  },
  {
    id: "organizzare",
    label: "Organizzare",
    title: "Per organizzare",
    description: "Dare una struttura ad appunti e collegamenti tra concetti.",
    ids: ["cornell", "mappe-concettuali"],
  },
  {
    id: "esame",
    label: "Allenarti all’esame",
    title: "Per allenarti all’esame",
    description: "Riconoscere il tipo di problema e rispondere con il tempo che scorre.",
    ids: ["interleaving", "simulazione-orale"],
  },
];

/** The two techniques with the strongest evidence: where a new student should start. */
export const STARTER_IDS = ["active-recall", "spaced-repetition"];

/** Techniques in the recommended order (groups first to last); unknown ids go last. */
export const ACADEMY_ORDER: Technique[] = (() => {
  const ids = ACADEMY_GROUPS.flatMap((g) => g.ids);
  const known = ids.map((id) => TECHNIQUES.find((t) => t.id === id)).filter((t): t is Technique => Boolean(t));
  return [...known, ...TECHNIQUES.filter((t) => !ids.includes(t.id))];
})();

export function groupOf(id: string): AcademyGroup {
  return ACADEMY_GROUPS.find((g) => g.ids.includes(id)) ?? ACADEMY_GROUPS[ACADEMY_GROUPS.length - 1];
}

export interface StepCheck {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

/** One quick "Prova tu" question per tutorial step, aligned with `Technique.steps`. */
export const STEP_CHECKS: Record<string, StepCheck[]> = {
  feynman: [
    {
      q: "Quale argomento è abbastanza delimitato per una spiegazione alla Feynman?",
      options: ["Il metabolismo", "Il ciclo di Krebs", "La biochimica"],
      answer: 1,
      why: "Il ciclo di Krebs ha confini chiari: lo spieghi in pochi minuti e vedi subito dove ti blocchi. «Il metabolismo» è un capitolo intero.",
    },
    {
      q: "Mentre spieghi, il libro…",
      options: ["Resta aperto, così non sbagli", "Resta chiuso: gli errori mostrano le lacune"],
      answer: 1,
      why: "Se copi dalla fonte non scopri che cosa sai davvero. Un errore adesso è un’informazione utile, non un fallimento.",
    },
    {
      q: "Quale di questi è un segnale di lacuna?",
      options: ["Usi «fosforilazione ossidativa» ma non sapresti definirla", "Fai un esempio con parole tue", "Scrivi frasi brevi"],
      answer: 0,
      why: "Un termine tecnico usato come scorciatoia nasconde spesso un passaggio che non hai capito.",
    },
    {
      q: "Quando torni al libro, che cosa studi?",
      options: ["Tutto il capitolo da capo", "Solo i punti in cui ti sei bloccato"],
      answer: 1,
      why: "Lo studio mirato sulle lacune è più efficiente. Poi chiudi di nuovo il libro e riprovi.",
    },
    {
      q: "Una spiegazione semplice è buona quando…",
      options: ["È breve, anche se un po’ imprecisa", "È semplice e corretta rispetto alla fonte"],
      answer: 1,
      why: "Semplificare non è banalizzare: confronta sempre la nuova versione con la fonte.",
    },
  ],
  "palazzo-memoria": [
    {
      q: "Quale luogo funziona meglio come primo palazzo?",
      options: ["Un museo visitato una volta", "La casa in cui vivi", "Un luogo inventato adesso"],
      answer: 1,
      why: "Serve un luogo che sai percorrere a occhi chiusi: è la memoria spaziale a fare da impalcatura.",
    },
    {
      q: "Il percorso nel palazzo…",
      options: ["Cambia ogni volta, per variare", "È sempre lo stesso, nello stesso ordine"],
      answer: 1,
      why: "L’ordine fisso dei luoghi ti permette di ricordare anche la sequenza dei concetti.",
    },
    {
      q: "Quale immagine ricordi meglio per «3 NADH»?",
      options: ["La scritta «3 NADH» su un foglio", "Tre fattorini con zaini carichi che corrono in cucina"],
      answer: 1,
      why: "Immagini concrete, esagerate e in movimento sono più distintive di una scritta.",
    },
    {
      q: "L’immagine collocata nel luogo deve…",
      options: ["Stare lì, ferma", "Fare qualcosa con il luogo: rompere, versare, illuminare"],
      answer: 1,
      why: "L’interazione lega l’immagine al luogo: quando ripercorri la casa, la scena riaffiora.",
    },
    {
      q: "Dopo averlo costruito, quando ripercorri il palazzo?",
      options: ["Subito, poi a intervalli crescenti", "Solo la sera prima dell’esame"],
      answer: 0,
      why: "Il palazzo si consolida con la ripetizione dilazionata, come ogni altro ricordo.",
    },
  ],
  "active-recall": [
    {
      q: "Quanto materiale studi prima di metterti alla prova?",
      options: ["Un capitolo intero", "Una sezione breve"],
      answer: 1,
      why: "Con un blocco breve il richiamo è possibile e il controllo è rapido.",
    },
    {
      q: "Durante il richiamo puoi guardare gli appunti?",
      options: ["Sì, quando ti blocchi", "No: prima richiami, poi controlli"],
      answer: 1,
      why: "Il beneficio viene dallo sforzo di recuperare. Guardare trasforma il recupero in rilettura.",
    },
    {
      q: "Quale attività è un vero richiamo?",
      options: ["Rileggere evidenziando", "Scrivere a memoria l’equazione di Henderson-Hasselbalch", "Riconoscere l’equazione in un elenco"],
      answer: 1,
      why: "Produrre la risposta da zero è più efficace del semplice riconoscimento.",
    },
    {
      q: "Dopo il richiamo, che cosa fai con gli errori?",
      options: ["Li segni e li correggi con la fonte", "Li ignori: l’importante è aver provato"],
      answer: 0,
      why: "Il feedback corregge gli errori e rende più forte l’effetto del test.",
    },
    {
      q: "Quando conviene il secondo richiamo?",
      options: ["Subito dopo il primo", "Il giorno dopo, poi dopo alcuni giorni"],
      answer: 1,
      why: "A distanza il recupero è più faticoso, e proprio per questo più utile.",
    },
  ],
  "spaced-repetition": [
    {
      q: "Quale flashcard è scritta meglio?",
      options: ["«Tutto sui tamponi»", "«pKa del sistema bicarbonato?» → «6,1»"],
      answer: 1,
      why: "Una carta con una sola idea si valuta onestamente e si ripassa in pochi secondi.",
    },
    {
      q: "Quando fai i ripassi in scadenza?",
      options: ["Ogni giorno, prima delle cose nuove", "Una volta a settimana, tutti insieme"],
      answer: 0,
      why: "Ripassare quando la carta scade la recupera poco prima che tu la dimentichi.",
    },
    {
      q: "Hai risposto giusto, ma con molta fatica. Come valuti la carta?",
      options: ["Facile", "Difficile"],
      answer: 1,
      why: "«Difficile» accorcia l’intervallo successivo: una valutazione onesta tiene il ripasso al momento giusto.",
    },
    {
      q: "Che cosa conta di più?",
      options: ["Due ore la domenica", "15–20 minuti ogni giorno"],
      answer: 1,
      why: "La costanza distribuisce i ripassi nel tempo: è proprio l’effetto della pratica distribuita.",
    },
  ],
  interleaving: [
    {
      q: "Quando ha senso mescolare gli esercizi?",
      options: ["Prima di aver capito i singoli argomenti", "Dopo una prima comprensione di ciascuno"],
      answer: 1,
      why: "L’interleaving allena a distinguere argomenti che conosci già: non sostituisce la prima comprensione.",
    },
    {
      q: "Quale mix è più utile?",
      options: ["Bernoulli, Poiseuille, Stevino", "Bernoulli, mitosi, nomenclatura IUPAC"],
      answer: 0,
      why: "Mescolare argomenti simili costringe a distinguerli. Argomenti scollegati portano pochi benefici.",
    },
    {
      q: "«Il raggio di un vaso si dimezza: come cambia la portata a parità di Δp?» Quale legge usi?",
      options: ["Continuità", "Poiseuille", "Stevino"],
      answer: 1,
      why: "Raggio e portata a Δp costante: è Poiseuille (Q ∝ r⁴), quindi la portata diventa 1/16.",
    },
    {
      q: "Hai usato Bernoulli dove serviva la continuità. Che cosa annoti?",
      options: ["Solo la risposta giusta", "L’indizio che ti è sfuggito: la domanda chiedeva la velocità al cambiare della sezione"],
      answer: 1,
      why: "Gli errori di classificazione insegnano quali indizi distinguono una legge dall’altra.",
    },
  ],
  "dual-coding": [
    {
      q: "Quante frasi chiave scrivi prima di disegnare?",
      options: ["Tutto il paragrafo", "Tre frasi brevi"],
      answer: 1,
      why: "Poche frasi chiave diventano le etichette dello schema.",
    },
    {
      q: "Quale disegno serve di più?",
      options: ["Uno schema semplice, con compartimenti e frecce", "Un disegno curato e colorato, ma senza relazioni"],
      answer: 0,
      why: "Servono diagrammi che spiegano: frecce e compartimenti, non decorazione.",
    },
    {
      q: "Dove si trova l’ATP sintasi?",
      options: ["Nella membrana esterna", "Nella membrana interna, con la testa F₁ nella matrice"],
      answer: 1,
      why: "Ogni parte del disegno deve corrispondere a una frase corretta: l’ATP sintasi sta nella membrana interna.",
    },
    {
      q: "Per ripassare, che cosa fai?",
      options: ["Riguardi il disegno", "Lo ridisegni senza guardare e lo spieghi ad alta voce"],
      answer: 1,
      why: "Ridisegnare e spiegare è un recupero su due vie: parole e immagine.",
    },
  ],
  elaborazione: [
    {
      q: "Quale affermazione merita un «perché?»",
      options: ["«Il FADH₂ rende meno ATP del NADH»", "«Il capitolo 7 parla dei mitocondri»"],
      answer: 0,
      why: "Scegli affermazioni con una causa da spiegare, non informazioni di contorno.",
    },
    {
      q: "Prima di cercare la spiegazione…",
      options: ["Leggi subito la risposta", "Formuli una tua ipotesi"],
      answer: 1,
      why: "Un’ipotesi, anche sbagliata, prepara la mente alla risposta e la rende più memorabile.",
    },
    {
      q: "Il FADH₂ rende meno ATP perché…",
      options: ["Cede gli elettroni al complesso II, che non pompa protoni", "Contiene meno energia di qualsiasi altra molecola"],
      answer: 0,
      why: "Entrando dal complesso II salta il complesso I: si pompano meno H⁺ e si forma meno ATP.",
    },
    {
      q: "Quale domanda ti aiuta a collegare?",
      options: ["Che cosa cambierebbe se il complesso II pompasse protoni?", "Quante pagine mancano alla fine?"],
      answer: 0,
      why: "Le domande «e se…?» inseriscono il fatto in una rete di cause e conseguenze.",
    },
  ],
  "auto-spiegazione": [
    {
      q: "Quale esempio scegli?",
      options: ["Breve, con passaggi numerati", "Lungo e senza passaggi intermedi"],
      answer: 0,
      why: "Un esempio breve e a passaggi rende esplicito ogni salto logico.",
    },
    {
      q: "Perché copri il passaggio successivo?",
      options: ["Per leggere più in fretta", "Per provare a prevederlo"],
      answer: 1,
      why: "Prevedere il passaggio è un piccolo recupero: il confronto mostra che cosa non avevi capito.",
    },
    {
      q: "«2 NADH × 2,5 = 5 ATP»: perché 2 NADH?",
      options: ["Perché da un glucosio si ottengono due piruvati", "Perché il NADH trasporta due elettroni"],
      answer: 0,
      why: "La piruvato deidrogenasi produce un NADH per ogni piruvato: da un glucosio, due piruvati, quindi due NADH.",
    },
    {
      q: "La tua spiegazione è diversa dal modello. Che cosa fai?",
      options: ["Passi oltre", "Annoti la differenza e il motivo"],
      answer: 1,
      why: "Le differenze annotate sono le incomprensioni da correggere.",
    },
  ],
  cornell: [
    {
      q: "Durante la lezione, nella colonna degli appunti scrivi…",
      options: ["Frasi brevi, simboli ed esempi", "Tutto, parola per parola"],
      answer: 0,
      why: "Appunti sintetici lasciano spazio all’ascolto e alla rielaborazione.",
    },
    {
      q: "Quando scrivi le domande guida?",
      options: ["La settimana prima dell’esame", "Entro 24 ore dalla lezione"],
      answer: 1,
      why: "Rielaborare gli appunti entro un giorno riduce l’oblio iniziale.",
    },
    {
      q: "Una buona sintesi è…",
      options: ["3–5 righe con parole tue", "La copia dei titoli della lezione"],
      answer: 0,
      why: "Riassumere con parole tue ti obbliga a scegliere l’essenziale.",
    },
    {
      q: "Per ripassare con il metodo Cornell…",
      options: ["Rileggi gli appunti", "Copri gli appunti e rispondi alle domande guida"],
      answer: 1,
      why: "Coprendo gli appunti, le domande guida diventano un test di recupero.",
    },
  ],
  "mappe-concettuali": [
    {
      q: "Quanti concetti per una mappa leggibile?",
      options: ["Da 8 a 12", "40 o più"],
      answer: 0,
      why: "Le mappe enormi diventano illeggibili: scegli i concetti che reggono l’argomento.",
    },
    {
      q: "Quale collegamento è più informativo?",
      options: ["Glucosio — Piruvato", "Glucosio → glicolisi → Piruvato"],
      answer: 1,
      why: "L’etichetta sulla freccia ti obbliga a precisare il tipo di legame.",
    },
    {
      q: "Quando confronti la tua mappa con quella di riferimento?",
      options: ["Mentre la copi dal libro", "Dopo averla costruita a memoria"],
      answer: 1,
      why: "Costruita a memoria, la mappa diventa pratica di recupero. Copiata dal libro, serve poco.",
    },
  ],
  "simulazione-orale": [
    {
      q: "Quale argomento scegli per la simulazione?",
      options: ["Uno che hai già studiato almeno una volta", "Uno mai visto, per metterti alla prova"],
      answer: 0,
      why: "La simulazione è un recupero: serve qualcosa da recuperare.",
    },
    {
      q: "Quanto tempo ti dai per ogni domanda?",
      options: ["Tutto il tempo che serve", "Circa 90 secondi"],
      answer: 1,
      why: "Un limite di tempo ricrea la pressione dell’esame e allena la sintesi.",
    },
    {
      q: "Perché usare una griglia di punti chiave?",
      options: ["Per fare prima", "Senza griglia l’autovalutazione tende a essere indulgente"],
      answer: 1,
      why: "Con una griglia esplicita la valutazione è onesta: il punto c’era oppure mancava.",
    },
    {
      q: "Quando ripeti le domande sbagliate?",
      options: ["Dopo un ripasso mirato", "Subito, finché non le indovini"],
      answer: 0,
      why: "Prima colmi la lacuna, poi verifichi di nuovo. Altrimenti memorizzi solo la risposta.",
    },
  ],
};

/** Title and one-line brief of the full exercise at the end of each tutorial. */
export const EXERCISE_INFO: Record<Technique["exercise"], { title: string; brief: string }> = {
  feynman: { title: "Spiega un argomento con parole semplici", brief: "ATLAS confronta la tua spiegazione con i concetti essenziali della lezione e ti mostra le lacune." },
  palace: { title: "Costruisci e percorri il tuo palazzo", brief: "Colloca i concetti lungo il percorso della casa, poi ripercorrilo a memoria." },
  recall: { title: "Scrivi tutto ciò che ricordi", brief: "Senza guardare la lezione. Poi confronti con i concetti essenziali." },
  spacing: { title: "Prevedi quanto ricorderai", brief: "Fai una stima, poi costruisci un piano di ripasso e guarda come cambia la curva." },
  interleaving: { title: "Riconosci la legge giusta", brief: "Otto quesiti di idrodinamica mescolati: per ognuno scegli la legge che serve." },
  dual: { title: "Etichetta il mitocondrio", brief: "Assegna ogni nome al punto giusto, poi descrivi a parole il percorso dei protoni." },
  why: { title: "Rispondi ai perché della lezione", brief: "Scrivi la tua spiegazione, poi confrontala con quella di riferimento." },
  "self-explain": { title: "Spiega i passaggi dell’esempio svolto", brief: "Per ogni passaggio scrivi che cosa succede e perché, poi confronta." },
  cornell: { title: "Prendi appunti Cornell e ripassali", brief: "Appunti, domande guida e sintesi. Poi copri gli appunti e rispondi." },
  "concept-map": { title: "Costruisci la mappa a memoria", brief: "Collega i concetti con un verbo, poi confronta con la mappa di riferimento." },
  oral: { title: "Rispondi come all’orale", brief: "Quattro domande, 90 secondi ciascuna, poi l’autovalutazione con la griglia." },
};
