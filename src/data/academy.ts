import type { Source, StudyMode } from "@/lib/types";

export type Goal = "comprensione" | "memorizzazione" | "problem solving" | "esposizione orale";

export interface Technique {
  id: string;
  name: string;
  tagline: string;
  icon: "feather" | "castle" | "repeat" | "calendar" | "shuffle" | "image" | "help" | "message" | "notebook" | "network" | "mic";
  goals: Goal[];
  modes: StudyMode[];
  evidence: { level: "alta" | "moderata" | "limitata" | "indiretta"; note: string };
  description: string[];
  principles: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  example: { title: string; text: string };
  exercise: "feynman" | "palace" | "recall" | "spacing" | "interleaving" | "dual" | "why" | "self-explain" | "cornell" | "concept-map" | "oral";
  whenToUse: string[];
  limits: string[];
  sources: Source[];
}

const DUNLOSKY: Source = {
  label: "Dunlosky J. et al. (2013). Improving students’ learning with effective learning techniques. Psychological Science in the Public Interest 14(1):4–58",
  doi: "10.1177/1529100612453266",
  kind: "articolo",
};

export const TECHNIQUES: Technique[] = [
  {
    id: "feynman",
    name: "Tecnica di Feynman",
    tagline: "Spiega in modo semplice per scoprire che cosa non hai capito.",
    icon: "feather",
    goals: ["comprensione", "esposizione orale"],
    modes: ["ultra", "deep"],
    evidence: {
      level: "indiretta",
      note: "Il nome è un’etichetta divulgativa ispirata al fisico Richard Feynman: non esistono studi controllati sulla «tecnica di Feynman» in quanto tale. Si basa però su effetti ben documentati: auto-spiegazione, apprendimento generativo e learning by teaching.",
    },
    description: [
      "Scegli un concetto e prova a spiegarlo con parole semplici, come se dovessi insegnarlo a una persona intelligente ma senza basi. Ogni volta che ti blocchi, usi un termine senza saperlo definire o salti un passaggio, hai trovato una **lacuna**.",
      "Torni alla fonte, colmi la lacuna e riprovi. Il valore non è nella semplicità finale, ma nel processo di **generare** una spiegazione e confrontarla con il modello corretto.",
    ],
    principles: [
      { title: "Effetto di generazione", text: "Le informazioni che produciamo attivamente si ricordano meglio di quelle che leggiamo passivamente." },
      { title: "Auto-spiegazione", text: "Spiegare a sé stessi i passaggi rende esplicite le inferenze e mette in luce le contraddizioni (Chi et al., 1994)." },
      { title: "Learning by teaching", text: "Preparare e fornire una spiegazione per altri migliora la comprensione rispetto al solo studio (Fiorella & Mayer, 2013)." },
      { title: "Metacognizione", text: "Il blocco durante la spiegazione è un segnale affidabile di ciò che non sai, più della sensazione di familiarità data dalla rilettura." },
    ],
    steps: [
      { title: "Scegli un concetto delimitato", text: "Es. «il ciclo di Krebs», non «il metabolismo»." },
      { title: "Spiegalo senza guardare", text: "Per iscritto o a voce, con frasi brevi e un esempio. Vietato il gergo che non sai definire." },
      { title: "Individua le lacune", text: "Segna i punti in cui ti sei bloccato, sei stato vago o hai usato un termine come scorciatoia." },
      { title: "Torna alla fonte", text: "Studia solo quei punti, poi chiudi di nuovo il libro." },
      { title: "Semplifica e riprova", text: "Riscrivi la spiegazione, aggiungi un’analogia e verifica che sia corretta, non solo semplice." },
    ],
    example: {
      title: "Esempio universitario: il ciclo di Krebs",
      text: "«Nel mitocondrio l’acetil-CoA si unisce all’ossalacetato e…» — se a questo punto non sai dire perché il ciclo si ferma senza ossigeno, hai trovato la lacuna: il legame con la rigenerazione di NAD⁺ e FAD da parte della catena respiratoria.",
    },
    exercise: "feynman",
    whenToUse: ["Concetti con una logica causale (meccanismi, processi)", "Prima di un esame orale", "Quando hai la sensazione di «aver capito» ma non riesci a fare esercizi"],
    limits: [
      "Semplificare non significa banalizzare: una spiegazione semplice ma sbagliata è peggio di nessuna. Confronta sempre con la fonte.",
      "È lenta: non adatta a memorizzare liste di dati (usa flashcard e ripetizione dilazionata).",
      "Senza feedback esterno rischi di non accorgerti degli errori: per questo ATLAS analizza la tua spiegazione.",
    ],
    sources: [
      { label: "Chi M.T.H. et al. (1994). Eliciting self-explanations improves understanding. Cognitive Science 18(3):439–477", doi: "10.1207/s15516709cog1803_3", kind: "articolo" },
      { label: "Fiorella L., Mayer R.E. (2013). The relative benefits of learning by teaching and teaching expectancy. Contemporary Educational Psychology 38(4):281–288", doi: "10.1016/j.cedpsych.2013.06.001", kind: "articolo" },
      { label: "Fiorella L., Mayer R.E. (2016). Eight ways to promote generative learning. Educational Psychology Review 28:717–741", doi: "10.1007/s10648-015-9348-9", kind: "articolo" },
    ],
  },
  {
    id: "palazzo-memoria",
    name: "Palazzo della memoria",
    tagline: "Il metodo dei loci: associa concetti a luoghi di un percorso familiare.",
    icon: "castle",
    goals: ["memorizzazione"],
    modes: ["ultra"],
    evidence: {
      level: "moderata",
      note: "Una meta-analisi (Twomey & Kroneisen, 2021) conferma l’efficacia del metodo dei loci soprattutto per liste e sequenze. È usato dai campioni di memoria (Maguire et al., 2003) e un allenamento di alcune settimane migliora il ricordo di liste (Dresler et al., 2017). Non sostituisce la comprensione.",
    },
    description: [
      "Scegli un ambiente che conosci benissimo (la tua casa) e un percorso fisso al suo interno. In ogni punto del percorso — un **locus** — collochi un’immagine vivida che rappresenta un concetto.",
      "Per ricordare, ripercorri mentalmente il tragitto e «raccogli» le immagini. La memoria spaziale fa da impalcatura per informazioni che altrimenti non avrebbero un ordine naturale.",
    ],
    principles: [
      { title: "Memoria spaziale", text: "Gli esseri umani ricordano molto bene luoghi e percorsi: il metodo sfrutta questa struttura già esistente." },
      { title: "Immagini bizzarre e interattive", text: "Immagini insolite, in movimento e che interagiscono con il luogo sono più distintive e quindi più facili da recuperare." },
      { title: "Indici di recupero ordinati", text: "Il percorso fornisce un ordine fisso: utile per sequenze (tappe di un ciclo, fasi della mitosi)." },
    ],
    steps: [
      { title: "Scegli il palazzo", text: "Un luogo reale e familiare. All’inizio bastano 5–10 loci." },
      { title: "Fissa il percorso", text: "Sempre nello stesso ordine: ingresso → cucina → soggiorno…" },
      { title: "Trasforma i concetti in immagini", text: "Concrete, esagerate, con un collegamento logico al contenuto." },
      { title: "Colloca e interagisci", text: "L’immagine deve «fare qualcosa» nel luogo (rompere, versare, illuminare)." },
      { title: "Ripercorri e verifica", text: "Ricostruisci la sequenza senza guardare, poi ripassa a intervalli crescenti." },
    ],
    example: {
      title: "Esempio universitario: le tappe del ciclo di Krebs",
      text: "Ingresso: due ospiti si stringono la mano e diventano uno con un limone (acetil-CoA + ossalacetato → citrato). Soggiorno: due camini fumano (2 CO₂). Corridoio: tre fattorini con zaini pieni (3 NADH)…",
    },
    exercise: "palace",
    whenToUse: ["Sequenze ordinate (fasi, tappe, cascate di segnalazione)", "Elenchi senza struttura logica (es. classi di virus)", "Ripasso finale di dati da recuperare rapidamente"],
    limits: [
      "Richiede tempo di costruzione: conviene per contenuti stabili da ricordare a lungo.",
      "Memorizza etichette e sequenze, non la comprensione dei meccanismi: va combinato con elaborazione e auto-spiegazione.",
      "Troppi contenuti nello stesso palazzo creano interferenza: usa palazzi diversi per argomenti diversi.",
    ],
    sources: [
      { label: "Twomey C., Kroneisen M. (2021). The effectiveness of the loci method as a mnemonic device: Meta-analysis. Quarterly Journal of Experimental Psychology 74(8):1317–1326", doi: "10.1177/1747021821993457", kind: "articolo" },
      { label: "Maguire E.A. et al. (2003). Routes to remembering: the brains behind superior memory. Nature Neuroscience 6:90–95", doi: "10.1038/nn988", kind: "articolo" },
      { label: "Dresler M. et al. (2017). Mnemonic training reshapes brain networks to support superior memory. Neuron 93(5):1227–1235", doi: "10.1016/j.neuron.2017.02.003", kind: "articolo" },
    ],
  },
  {
    id: "active-recall",
    name: "Active Recall",
    tagline: "Recupera dalla memoria invece di rileggere.",
    icon: "repeat",
    goals: ["memorizzazione", "comprensione"],
    modes: ["fast", "deep", "ultra"],
    evidence: {
      level: "alta",
      note: "La pratica di recupero (testing effect) è tra le tecniche con le prove più solide: Dunlosky et al. (2013) la classificano ad «alta utilità»; meta-analisi successive confermano l’effetto su contenuti e popolazioni diverse (Rowland, 2014; Adesope et al., 2017).",
    },
    description: [
      "Chiudi il libro e prova a **richiamare** ciò che hai studiato: rispondi a domande, scrivi tutto ciò che ricordi, risolvi un problema. Solo dopo controlli.",
      "Recuperare un ricordo non è solo una verifica: **modifica** la memoria, rendendola più stabile e più facile da ritrovare in futuro.",
    ],
    principles: [
      { title: "Testing effect", text: "Dopo lo stesso tempo di studio, chi si mette alla prova ricorda di più a distanza di giorni rispetto a chi rilegge (Roediger & Karpicke, 2006)." },
      { title: "Difficoltà desiderabili", text: "Un recupero faticoso ma riuscito produce più apprendimento di uno facile." },
      { title: "Feedback", text: "Controllare la risposta corregge gli errori e potenzia l’effetto." },
    ],
    steps: [
      { title: "Studia un blocco breve", text: "Una sezione, non un capitolo intero." },
      { title: "Chiudi le fonti", text: "Niente appunti sotto gli occhi." },
      { title: "Richiama", text: "Scrivi tutto ciò che ricordi o rispondi a domande precise." },
      { title: "Confronta", text: "Evidenzia ciò che mancava o era sbagliato." },
      { title: "Ripeti a distanza", text: "Riprova il giorno dopo, poi dopo alcuni giorni." },
    ],
    example: {
      title: "Esempio universitario: tamponi",
      text: "Dopo aver letto la sezione, scrivi a memoria Henderson-Hasselbalch, il pKa del bicarbonato e il rapporto a pH 7,4. Poi controlla: se hai scritto «pKa 7,4» hai trovato un errore da correggere.",
    },
    exercise: "recall",
    whenToUse: ["Sempre, dopo una prima comprensione", "Per fissare definizioni, dati e formule", "Come ripasso prima dell’esame"],
    limits: [
      "Se usato troppo presto, prima di capire, può produrre solo frustrazione: alterna con elaborazione.",
      "Le domande devono richiedere comprensione, non solo riconoscimento di parole.",
    ],
    sources: [
      { label: "Roediger H.L., Karpicke J.D. (2006). Test-enhanced learning. Psychological Science 17(3):249–255", doi: "10.1111/j.1467-9280.2006.01693.x", kind: "articolo" },
      { label: "Rowland C.A. (2014). The effect of testing versus restudy on retention: A meta-analytic review of the testing effect. Psychological Bulletin 140(6):1432–1463", doi: "10.1037/a0037559", kind: "articolo" },
      { label: "Adesope O.O. et al. (2017). Rethinking the use of tests: A meta-analysis of practice testing. Review of Educational Research 87(3):659–701", doi: "10.3102/0034654316689306", kind: "articolo" },
      DUNLOSKY,
    ],
  },
  {
    id: "spaced-repetition",
    name: "Ripetizione dilazionata",
    tagline: "Ripassa poco prima di dimenticare, a intervalli crescenti.",
    icon: "calendar",
    goals: ["memorizzazione"],
    modes: ["fast", "deep", "ultra"],
    evidence: {
      level: "alta",
      note: "L’effetto della pratica distribuita è uno dei risultati più replicati della psicologia (Cepeda et al., 2006). L’intervallo ottimale dipende da quanto a lungo si deve ricordare (Cepeda et al., 2008).",
    },
    description: [
      "Invece di ripetere tutto in un’unica sessione (studio «massivo»), distribuisci i ripassi nel tempo con intervalli via via più lunghi: 1 giorno, 3 giorni, una settimana, due settimane…",
      "Le flashcard di ATLAS usano un algoritmo derivato da SM-2 che adatta l’intervallo alla difficoltà che dichiari a ogni risposta.",
    ],
    principles: [
      { title: "Curva dell’oblio", text: "Senza ripasso il ricordo decade rapidamente nei primi giorni (Ebbinghaus, 1885; replicato da Murre & Dros, 2015)." },
      { title: "Spacing effect", text: "A parità di tempo totale, sessioni distribuite producono ricordi più duraturi di sessioni concentrate." },
      { title: "Intervalli crescenti", text: "Ogni recupero riuscito rende la traccia più stabile: il ripasso successivo può essere più lontano." },
    ],
    steps: [
      { title: "Trasforma i contenuti in domande", text: "Flashcard con una sola idea per carta." },
      { title: "Ripassa ciò che è in scadenza", text: "Ogni giorno, prima di studiare cose nuove." },
      { title: "Valuta onestamente", text: "Di nuovo / Difficile / Buono / Facile: l’intervallo si adatta." },
      { title: "Non saltare i giorni", text: "La costanza conta più della durata: 15–20 minuti al giorno." },
    ],
    example: {
      title: "Esempio universitario: dati da ricordare",
      text: "pKa del bicarbonato, numero di geni del mtDNA, emivita del tecnezio-99m: dati brevi e verificabili, perfetti per la ripetizione dilazionata.",
    },
    exercise: "spacing",
    whenToUse: ["Definizioni, formule, dati numerici", "Tutto ciò che deve restare fino all’esame e oltre", "Programmazione dei ripassi nel calendario"],
    limits: [
      "Funziona su ciò che hai già capito: una carta che non comprendi va riscritta, non ripetuta.",
      "Accumulare troppe carte nuove ogni giorno crea un carico di ripasso insostenibile.",
    ],
    sources: [
      { label: "Cepeda N.J. et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin 132(3):354–380", doi: "10.1037/0033-2909.132.3.354", kind: "articolo" },
      { label: "Cepeda N.J. et al. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. Psychological Science 19(11):1095–1102", doi: "10.1111/j.1467-9280.2008.02209.x", kind: "articolo" },
      { label: "Murre J.M.J., Dros J. (2015). Replication and analysis of Ebbinghaus’ forgetting curve. PLOS ONE 10(7):e0120644", doi: "10.1371/journal.pone.0120644", kind: "articolo" },
      DUNLOSKY,
    ],
  },
  {
    id: "interleaving",
    name: "Interleaving",
    tagline: "Alterna tipi di problemi per imparare a riconoscerli.",
    icon: "shuffle",
    goals: ["problem solving"],
    modes: ["ultra", "deep"],
    evidence: {
      level: "moderata",
      note: "Utile soprattutto per discriminare categorie simili e scegliere la strategia giusta (Rohrer & Taylor, 2007; Kornell & Bjork, 2008). La meta-analisi di Brunmair & Richter (2019) mostra effetti variabili: forti per categorie simili, minori o assenti in altri casi.",
    },
    description: [
      "Invece di fare dieci esercizi di Bernoulli e poi dieci di Poiseuille (pratica a blocchi), li **mescoli**. Ogni esercizio ti costringe prima a chiederti: *che tipo di problema è? quale legge si applica?*",
      "Durante la pratica sembra più difficile e meno produttivo, ma all’esame — dove i quesiti arrivano mescolati — rende di più.",
    ],
    principles: [
      { title: "Discriminazione", text: "Confrontare categorie diverse in sequenza mette in risalto le differenze rilevanti." },
      { title: "Scelta della strategia", text: "Nella pratica a blocchi il metodo è implicito; mescolando devi riconoscerlo da solo." },
      { title: "Difficoltà desiderabili", text: "La sensazione di fatica non è un segnale di inefficacia." },
    ],
    steps: [
      { title: "Studia prima ogni argomento", text: "L’interleaving non sostituisce la prima comprensione." },
      { title: "Mescola argomenti affini", text: "Es. continuità, Bernoulli, Poiseuille, Stevino." },
      { title: "Prima di risolvere, classifica", text: "Scrivi quale legge useresti e perché." },
      { title: "Analizza gli errori di classificazione", text: "Sono i più istruttivi." },
    ],
    example: {
      title: "Esempio universitario: fluidi",
      text: "«Un vaso si restringe: la velocità?» (continuità); «La pressione nel tratto stretto?» (Bernoulli); «Il raggio si dimezza: la portata a parità di Δp?» (Poiseuille); «Pressione a 10 m di profondità?» (Stevino).",
    },
    exercise: "interleaving",
    whenToUse: ["Fisica e chimica: esercizi numerici", "Argomenti facilmente confondibili", "Preparazione alle simulazioni"],
    limits: [
      "Inefficace se gli argomenti non sono ancora stati capiti singolarmente.",
      "Mescolare argomenti del tutto scollegati porta pochi benefici.",
    ],
    sources: [
      { label: "Rohrer D., Taylor K. (2007). The shuffling of mathematics problems improves learning. Instructional Science 35:481–498", doi: "10.1007/s11251-007-9015-8", kind: "articolo" },
      { label: "Kornell N., Bjork R.A. (2008). Learning concepts and categories: Is spacing the “enemy of induction”? Psychological Science 19(6):585–592", doi: "10.1111/j.1467-9280.2008.02127.x", kind: "articolo" },
      { label: "Brunmair M., Richter T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. Psychological Bulletin 145(11):1029–1052", doi: "10.1037/bul0000209", kind: "articolo" },
    ],
  },
  {
    id: "dual-coding",
    name: "Dual Coding",
    tagline: "Combina parole e immagini dello stesso concetto.",
    icon: "image",
    goals: ["comprensione", "memorizzazione"],
    modes: ["ultra", "deep"],
    evidence: {
      level: "moderata",
      note: "La teoria del doppio codice (Paivio) propone sistemi distinti per informazioni verbali e visive. Attenzione: non va confusa con gli «stili di apprendimento» (visivo, uditivo…), che non hanno supporto sperimentale (Pashler et al., 2008).",
    },
    description: [
      "Per ogni concetto importante crea **due rappresentazioni collegate**: una verbale (definizione, spiegazione) e una visiva (schema, diagramma, grafico). Poi passa dall’una all’altra: descrivi a parole il disegno, disegna ciò che hai letto.",
      "Vale per tutti gli studenti: non esiste un «tipo visivo» che ne beneficia più degli altri.",
    ],
    principles: [
      { title: "Due tracce di memoria", text: "Codici verbali e visivi collegati offrono più vie di recupero." },
      { title: "Integrazione", text: "Tradurre tra testo e immagine obbliga a capire le relazioni, non solo i nomi." },
      { title: "Sobrietà", text: "Immagini decorative o ridondanti possono distrarre: servono diagrammi che spiegano." },
    ],
    steps: [
      { title: "Leggi e sintetizza a parole", text: "Tre frasi chiave." },
      { title: "Disegna lo schema", text: "Anche semplice: frecce, compartimenti, grafici." },
      { title: "Etichetta e collega", text: "Ogni parte del disegno deve corrispondere a una frase." },
      { title: "Ricostruisci a memoria", text: "Ridisegna senza guardare e spiega ad alta voce." },
    ],
    example: {
      title: "Esempio universitario: il mitocondrio",
      text: "Disegna le due membrane, le creste e la matrice; colloca catena respiratoria e ATP sintasi sulla membrana interna e il ciclo di Krebs nella matrice. Poi descrivi a parole il percorso dei protoni.",
    },
    exercise: "dual",
    whenToUse: ["Strutture (organelli, molecole)", "Processi con compartimenti e flussi", "Grafici di fisica e chimica (titolazione, decadimento)"],
    limits: [
      "Disegni belli ma poco informativi fanno perdere tempo.",
      "Non è una scorciatoia per evitare il testo: le due codifiche si rinforzano a vicenda.",
    ],
    sources: [
      { label: "Paivio A. (1991). Dual coding theory: Retrospect and current status. Canadian Journal of Psychology 45(3):255–287", doi: "10.1037/h0084295", kind: "articolo" },
      { label: "Pashler H. et al. (2008). Learning styles: Concepts and evidence. Psychological Science in the Public Interest 9(3):105–119", doi: "10.1111/j.1539-6053.2009.01038.x", kind: "articolo" },
    ],
  },
  {
    id: "elaborazione",
    name: "Elaborazione approfondita",
    tagline: "Chiediti «perché?» e collega al già noto.",
    icon: "help",
    goals: ["comprensione"],
    modes: ["deep", "ultra"],
    evidence: {
      level: "moderata",
      note: "L’interrogazione elaborativa è classificata a «utilità moderata» da Dunlosky et al. (2013): efficace soprattutto quando si hanno già conoscenze di base sull’argomento (Pressley et al., 1987).",
    },
    description: [
      "Per ogni affermazione importante ti chiedi **perché è vera** e **come si collega** a ciò che già sai. Non accetti un fatto isolato: lo inserisci in una rete di cause e conseguenze.",
    ],
    principles: [
      { title: "Profondità di elaborazione", text: "Elaborare il significato produce tracce più durature dell’elaborazione superficiale." },
      { title: "Integrazione con le conoscenze precedenti", text: "Collegare nuovi fatti a schemi esistenti facilita sia la comprensione sia il recupero." },
    ],
    steps: [
      { title: "Individua un’affermazione chiave", text: "Es. «Il FADH₂ rende meno ATP del NADH»." },
      { title: "Chiediti perché", text: "Formula una spiegazione prima di cercarla." },
      { title: "Verifica", text: "Confronta con la fonte e correggi." },
      { title: "Collega", text: "A cosa somiglia? Cosa cambierebbe se fosse falso?" },
    ],
    example: {
      title: "Esempio universitario: Bernoulli",
      text: "«Perché nella stenosi la pressione cala?» → per accelerare, il fluido deve essere spinto da una pressione maggiore alle spalle: la zona veloce è a pressione minore.",
    },
    exercise: "why",
    whenToUse: ["Meccanismi biologici e leggi fisiche", "Dopo una prima lettura", "Quando i fatti sembrano arbitrari"],
    limits: ["Meno efficace se non hai alcuna conoscenza di base sull’argomento.", "Richiede di verificare le proprie spiegazioni: un «perché» sbagliato si consolida."],
    sources: [
      DUNLOSKY,
      { label: "Pressley M. et al. (1987). Generation and precision of elaboration: Effects on intentional and incidental learning. Journal of Experimental Psychology: Learning, Memory, and Cognition 13(2):291–300", doi: "10.1037/0278-7393.13.2.291", kind: "articolo" },
    ],
  },
  {
    id: "auto-spiegazione",
    name: "Auto-spiegazione",
    tagline: "Spiega a te stesso ogni passaggio di un esempio svolto.",
    icon: "message",
    goals: ["comprensione", "problem solving"],
    modes: ["deep", "ultra"],
    evidence: {
      level: "moderata",
      note: "Chi spiega a sé stesso i passaggi di un testo o di un esempio risolto lo comprende meglio (Chi et al., 1994). Dunlosky et al. (2013) la classificano a «utilità moderata».",
    },
    description: [
      "Davanti a un esercizio risolto non ti limiti a leggere la soluzione: per **ogni passaggio** ti chiedi che cosa è stato fatto, perché e da quale principio deriva.",
    ],
    principles: [
      { title: "Inferenze esplicite", text: "Rende visibili i passaggi impliciti che i testi danno per scontati." },
      { title: "Rilevazione dei conflitti", text: "Confrontare la propria spiegazione con il passaggio successivo fa emergere incomprensioni." },
    ],
    steps: [
      { title: "Prendi un esempio svolto", text: "Breve, con passaggi numerati." },
      { title: "Copri il passaggio successivo", text: "Prova a prevederlo." },
      { title: "Spiega il passaggio", text: "Quale principio? Perché proprio così?" },
      { title: "Confronta con la spiegazione modello", text: "Annota le differenze." },
    ],
    example: {
      title: "Esempio universitario: bilancio dell’ATP",
      text: "«2 NADH × 2,5 = 5 ATP» — perché 2? Perché da un glucosio si ottengono due piruvati. Perché 2,5? Per la stechiometria dell’ATP sintasi e del trasporto.",
    },
    exercise: "self-explain",
    whenToUse: ["Esercizi numerici di fisica e chimica", "Dimostrazioni e derivazioni", "Bilanci (energetici, di massa, di carica)"],
    limits: ["Funziona meno con esempi troppo lunghi o troppo facili.", "Serve un esempio svolto corretto di partenza."],
    sources: [
      { label: "Chi M.T.H. et al. (1994). Eliciting self-explanations improves understanding. Cognitive Science 18(3):439–477", doi: "10.1207/s15516709cog1803_3", kind: "articolo" },
      DUNLOSKY,
    ],
  },
  {
    id: "cornell",
    name: "Metodo Cornell",
    tagline: "Appunti in tre zone: note, domande guida, sintesi.",
    icon: "notebook",
    goals: ["comprensione", "memorizzazione"],
    modes: ["deep"],
    evidence: {
      level: "limitata",
      note: "Il formato fu proposto da Walter Pauk (Cornell University) negli anni ’50. Le prove sperimentali specifiche sono limitate; il suo valore deriva dal fatto che integra rielaborazione (sintesi) e pratica di recupero (domande guida), entrambe ben supportate.",
    },
    description: [
      "Dividi la pagina in tre zone: a destra gli **appunti** presi durante la lezione o la lettura; a sinistra, subito dopo, le **domande guida** (cue) che quegli appunti rispondono; in basso una **sintesi** di poche righe.",
      "Per ripassare copri la colonna degli appunti e rispondi alle domande guida: il formato si trasforma in uno strumento di active recall.",
    ],
    principles: [
      { title: "Rielaborazione entro 24 ore", text: "Riorganizzare gli appunti subito dopo la lezione riduce l’oblio iniziale." },
      { title: "Recupero guidato", text: "Le domande della colonna sinistra trasformano gli appunti in un test." },
      { title: "Sintesi", text: "Riassumere con parole proprie richiede di selezionare l’essenziale." },
    ],
    steps: [
      { title: "Appunti", text: "Durante la lezione: frasi brevi, simboli, esempi." },
      { title: "Domande guida", text: "Entro 24 ore: una domanda per ogni blocco di appunti." },
      { title: "Sintesi", text: "3–5 righe con parole tue." },
      { title: "Ripasso", text: "Copri gli appunti e rispondi alle domande." },
    ],
    example: {
      title: "Esempio universitario: lezione sui tamponi",
      text: "Domanda guida: «Perché il bicarbonato funziona con pKa 6,1?» → appunti: sistema aperto, polmoni e reni. Sintesi: «Il pH dipende dal rapporto HCO₃⁻/CO₂ regolato da due organi».",
    },
    exercise: "cornell",
    whenToUse: ["Lezioni del semestre (frequenza obbligatoria)", "Letture di capitoli", "Preparare materiale per il ripasso"],
    limits: ["Se le domande guida restano inutilizzate è solo un modo diverso di prendere appunti.", "Richiede disciplina nella rielaborazione post-lezione."],
    sources: [
      { label: "Pauk W., Owens R.J.Q. How to Study in College (Cengage Learning, varie edizioni)", kind: "manuale" },
      { label: "Roediger H.L., Karpicke J.D. (2006). Test-enhanced learning. Psychological Science 17(3):249–255", doi: "10.1111/j.1467-9280.2006.01693.x", kind: "articolo" },
    ],
  },
  {
    id: "mappe-concettuali",
    name: "Mappe concettuali",
    tagline: "Rendi visibili le relazioni tra concetti.",
    icon: "network",
    goals: ["comprensione"],
    modes: ["deep"],
    evidence: {
      level: "moderata",
      note: "Utili per organizzare relazioni. Uno studio noto (Karpicke & Blunt, 2011) ha mostrato che, come attività di studio, la pratica di recupero supera la costruzione di mappe: in ATLAS le mappe si costruiscono a memoria e si confrontano con quella di riferimento.",
    },
    description: [
      "Una mappa concettuale collega concetti (nodi) con frasi di collegamento (archi etichettate) che esprimono la relazione: «la catena respiratoria → pompa → protoni».",
    ],
    principles: [
      { title: "Struttura esplicita", text: "Le relazioni etichettate obbligano a precisare il tipo di legame." },
      { title: "Recupero", text: "Costruire la mappa a memoria la trasforma in pratica di recupero." },
    ],
    steps: [
      { title: "Elenca i concetti chiave", text: "8–12 nodi." },
      { title: "Collega con verbi", text: "Ogni freccia ha un’etichetta." },
      { title: "Confronta con la mappa di riferimento", text: "Cerca collegamenti mancanti o errati." },
    ],
    example: { title: "Esempio universitario: respirazione cellulare", text: "Glucosio → (glicolisi) → piruvato → (piruvato deidrogenasi) → acetil-CoA → (+ ossalacetato) → ciclo di Krebs → (produce) → NADH…" },
    exercise: "concept-map",
    whenToUse: ["Argomenti con molti concetti collegati", "Ripasso di fine capitolo"],
    limits: ["Costruire mappe copiando dal libro è poco efficace.", "Mappe enormi diventano illeggibili."],
    sources: [
      { label: "Karpicke J.D., Blunt J.R. (2011). Retrieval practice produces more learning than elaborative studying with concept mapping. Science 331(6018):772–775", doi: "10.1126/science.1199327", kind: "articolo" },
    ],
  },
  {
    id: "simulazione-orale",
    name: "Simulazione orale",
    tagline: "Rispondi ad alta voce, con i tempi e la pressione di un esame.",
    icon: "mic",
    goals: ["esposizione orale", "memorizzazione"],
    modes: ["ultra"],
    evidence: {
      level: "indiretta",
      note: "Combina pratica di recupero e prova nelle condizioni del test. L’esame del semestre filtro è scritto, ma l’esposizione orale prepara agli esami successivi del corso di laurea e consolida la comprensione.",
    },
    description: ["Un esaminatore (ATLAS o un compagno) pone domande, anche di approfondimento; rispondi a voce o per iscritto entro un tempo limite, poi ricevi una valutazione con punti di forza e lacune."],
    principles: [
      { title: "Pratica di recupero", text: "Ogni domanda è un recupero attivo." },
      { title: "Specificità del contesto", text: "Esercitarsi in condizioni simili a quelle d’esame facilita il trasferimento." },
    ],
    steps: [
      { title: "Scegli l’argomento", text: "Uno studiato almeno una volta." },
      { title: "Rispondi entro il tempo", text: "90 secondi per domanda." },
      { title: "Autovaluta con la griglia", text: "Punti chiave presenti o assenti." },
      { title: "Ripeti le domande sbagliate", text: "Dopo un ripasso mirato." },
    ],
    example: { title: "Esempio universitario", text: "«Mi parli della fosforilazione ossidativa» → «E cosa succede con l’oligomicina?» → «Perché il consumo di ossigeno cala?»" },
    exercise: "oral",
    whenToUse: ["Ripasso finale", "Argomenti ampi da collegare", "Allenare la chiarezza espositiva"],
    limits: ["L’ansia da prestazione può interferire: inizia con domande facili.", "Senza griglia di valutazione l’autovalutazione tende a essere indulgente."],
    sources: [
      { label: "Roediger H.L., Karpicke J.D. (2006). Test-enhanced learning. Psychological Science 17(3):249–255", doi: "10.1111/j.1467-9280.2006.01693.x", kind: "articolo" },
      { label: "Metcalfe J. (2017). Learning from errors. Annual Review of Psychology 68:465–489", doi: "10.1146/annurev-psych-010416-044022", kind: "articolo" },
    ],
  },
];

export function getTechnique(id: string) {
  return TECHNIQUES.find((t) => t.id === id);
}

export const MODE_INFO: Record<StudyMode, { name: string; claim: string; description: string; techniques: string[]; bestFor: string; time: string }> = {
  fast: {
    name: "Fast Study",
    claim: "Apprendimento essenziale",
    description: "Per chi ha poco tempo: i concetti fondamentali, senza semplificazioni scorrette.",
    techniques: ["Riassunto essenziale", "Definizioni chiave", "Schema sintetico", "Flashcard rapide", "Quiz 5–10 domande", "Obiettivi del syllabus"],
    bestFor: "Primo contatto con un argomento o ripasso veloce",
    time: "15–25 min",
  },
  deep: {
    name: "Deep Study",
    claim: "Apprendimento strutturato",
    description: "Per una preparazione universitaria completa, con verifica della comprensione e analisi delle lacune.",
    techniques: ["Spiegazione approfondita", "Esempi e applicazioni", "Mappa concettuale", "Active recall", "Metodo Cornell", "Quiz progressivo", "Problemi guidati", "Analisi delle lacune"],
    bestFor: "Comprensione solida e problem solving",
    time: "50–90 min",
  },
  ultra: {
    name: "Ultra Study",
    claim: "Apprendimento avanzato",
    description: "Un percorso guidato che combina le tecniche cognitive più adatte all’argomento.",
    techniques: ["Tecnica di Feynman", "Palazzo della memoria", "Interleaving", "Dual coding", "Elaborazione", "Auto-spiegazione", "Simulazione orale"],
    bestFor: "Consolidamento profondo e preparazione all’esame",
    time: "60–120 min",
  },
};
