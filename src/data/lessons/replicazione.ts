import type { Lesson } from "@/lib/types";

export const replicazione: Lesson = {
  topicId: "bio-replicazione-dna",
  readingMinutes: 30,
  diagram: "replication-fork",
  intro: [
    "Prima di ogni divisione una cellula umana deve copiare circa **6 miliardi di paia di basi** in poche ore, commettendo in media meno di un errore ogni miliardo di nucleotidi. Ci riesce grazie a una macchina molecolare coordinata: la **forcella replicativa**.",
    "In questa lezione costruisci il modello passo dopo passo: perché la replicazione è **semiconservativa**, come inizia alle **origini**, quali enzimi srotolano, innescano, copiano, correggono e saldano il DNA, e perché le estremità dei cromosomi lineari richiedono una soluzione speciale, la **telomerasi**.",
  ],
  fastSummary: [
    "La replicazione è **semiconservativa**: ogni doppia elica figlia contiene un filamento parentale e uno nuovo (Meselson e Stahl, 1958).",
    "Inizia alle **origini di replicazione**: una sola nel cromosoma circolare di *E. coli*, decine di migliaia nel genoma umano. Da ogni origine partono due forcelle (replicazione **bidirezionale**).",
    "L’**elicasi** separa i filamenti; le proteine **SSB** (RPA negli eucarioti) li stabilizzano; le **topoisomerasi** eliminano il superavvolgimento a monte della forcella.",
    "Le DNA polimerasi non iniziano da zero: la **primasi** sintetizza un breve **innesco di RNA** che fornisce l’estremità 3′-OH.",
    "Le DNA polimerasi sintetizzano **solo in direzione 5′→3′** e hanno attività di **correzione di bozze** (esonucleasi 3′→5′).",
    "Il **filamento guida** (leading) è sintetizzato in modo continuo; il **filamento lento** (lagging) in modo discontinuo, a **frammenti di Okazaki**.",
    "Gli inneschi di RNA vengono rimossi e sostituiti con DNA; la **DNA ligasi** salda i frammenti formando legami fosfodiestere.",
    "Ai **telomeri** (ripetizioni TTAGGG nell’uomo) l’ultimo tratto del filamento lento non può essere completato: i cromosomi si accorciano a ogni ciclo, fino alla **senescenza replicativa**. La **telomerasi**, una trascrittasi inversa con stampo di RNA, li riallunga nelle cellule germinali, staminali e in molti tumori.",
  ],
  keyConcepts: [
    "Meccanismo semiconservativo",
    "Origini, complesso d’inizio e replicazione bidirezionale",
    "Elicasi, SSB e topoisomerasi",
    "Primasi e innesco di RNA",
    "Direzione 5′→3′ e correzione di bozze",
    "Filamento continuo e discontinuo, frammenti di Okazaki",
    "Rimozione degli inneschi e DNA ligasi",
    "Problema della replicazione delle estremità, telomeri e telomerasi",
  ],
  definitions: [
    { term: "Origine di replicazione", definition: "Sequenza di DNA dove si assembla il complesso d’inizio e partono due forcelle replicative." },
    { term: "Forcella replicativa", definition: "Struttura a Y in cui la doppia elica viene aperta e i due filamenti stampo vengono copiati." },
    { term: "Primer (innesco)", definition: "Breve segmento di RNA (circa 10 nucleotidi) sintetizzato dalla primasi; fornisce il 3′-OH da cui la DNA polimerasi può partire." },
    { term: "Frammenti di Okazaki", definition: "Segmenti di DNA del filamento lento: 1000–2000 nucleotidi nei procarioti, 100–200 negli eucarioti." },
    { term: "Correzione di bozze (proofreading)", definition: "Attività esonucleasica 3′→5′ della DNA polimerasi che rimuove il nucleotide appena inserito se non è appaiato correttamente." },
    { term: "Telomero", definition: "Estremità di un cromosoma lineare formata da ripetizioni in tandem (TTAGGG nell’uomo) e protetta da un complesso proteico (shelterina)." },
    { term: "Telomerasi", definition: "Ribonucleoproteina con attività di trascrittasi inversa (TERT) che usa un proprio stampo di RNA per aggiungere ripetizioni telomeriche all’estremità 3′." },
    { term: "Senescenza replicativa", definition: "Arresto permanente della proliferazione quando i telomeri raggiungono una lunghezza critica." },
  ],
  schema: {
    title: "La forcella replicativa in 6 mosse",
    steps: [
      { label: "Riconoscimento dell’origine", detail: "ORC (eucarioti) / DnaA (E. coli) → carico dell’elicasi" },
      { label: "Apertura", detail: "Elicasi + SSB/RPA; topoisomerasi davanti alla forcella" },
      { label: "Innesco", detail: "Primasi → primer di RNA con 3′-OH libero" },
      { label: "Allungamento", detail: "DNA polimerasi 5′→3′ · leading continuo, lagging a frammenti" },
      { label: "Maturazione", detail: "Rimozione dei primer, riempimento, DNA ligasi" },
      { label: "Estremità", detail: "Telomeri e telomerasi nei cromosomi lineari" },
    ],
  },
  sections: [
    {
      id: "semiconservativo",
      title: "Il meccanismo semiconservativo",
      body: [
        "Il modello a doppia elica di **Watson e Crick** (1953) suggeriva già un meccanismo di copia: i due filamenti sono complementari, quindi ciascuno può fare da **stampo** per l’altro.",
        "Nel 1958 **Meselson e Stahl** coltivarono *E. coli* in un terreno con azoto pesante (¹⁵N) e poi lo trasferirono in ¹⁴N. Con la centrifugazione in gradiente di densità di cloruro di cesio osservarono, dopo una generazione, **solo DNA a densità intermedia**; dopo due generazioni, **metà intermedio e metà leggero**. Il risultato esclude il modello conservativo e quello dispersivo e conferma il modello **semiconservativo**.",
      ],
    },
    {
      id: "origini",
      title: "Origini e complesso d’inizio",
      body: [
        "Nei procarioti il cromosoma circolare ha in genere **una sola origine** (in *E. coli*, *oriC*), riconosciuta dalla proteina DnaA. Negli eucarioti i cromosomi lineari, molto più lunghi, hanno **molte origini**: nell’uomo decine di migliaia, attivate in momenti diversi della fase S.",
        "Negli eucarioti il **complesso di riconoscimento dell’origine (ORC)**, insieme a Cdc6 e Cdt1, carica l’elicasi MCM durante la fase G1 («licenza»). All’ingresso in fase S le chinasi CDK e DDK attivano l’elicasi. Poiché il carico è possibile solo in G1 e l’attivazione solo in S, ogni origine si attiva **una sola volta per ciclo**: il genoma viene copiato esattamente una volta.",
        "Da ogni origine partono **due forcelle** che procedono in direzioni opposte: la replicazione è **bidirezionale**.",
      ],
    },
    {
      id: "srotolamento",
      title: "Lo srotolamento: elicasi e topoisomerasi",
      body: [
        "L’**elicasi** usa l’energia dell’ATP per rompere i legami idrogeno tra le basi e separare i filamenti. I filamenti singoli esposti vengono rivestiti da **proteine che legano il DNA a singolo filamento** (SSB nei batteri, **RPA** negli eucarioti), che impediscono il riappaiamento e proteggono dalle nucleasi.",
        "Aprire la doppia elica in un punto aumenta l’avvolgimento davanti alla forcella. Le **topoisomerasi** risolvono questa tensione: quelle di **tipo I** tagliano un solo filamento e non richiedono ATP; quelle di **tipo II** tagliano entrambi i filamenti e consumano ATP. Nei batteri la **DNA girasi**, una topoisomerasi di tipo II, introduce superavvolgimenti negativi.",
      ],
      callout: { tone: "clinical", text: "I fluorochinoloni (es. ciprofloxacina) inibiscono la DNA girasi e la topoisomerasi IV batteriche; alcuni chemioterapici agiscono sulle topoisomerasi umane (irinotecan sulla topoisomerasi I, etoposide sulla II)." },
    },
    {
      id: "innesco",
      title: "La primasi e l’innesco",
      body: [
        "Nessuna DNA polimerasi può iniziare una catena dal nulla: tutte aggiungono nucleotidi a un **3′-OH preesistente**. La **primasi**, una RNA polimerasi specializzata, sintetizza un breve **primer di RNA** complementare allo stampo.",
        "Sul filamento guida basta in linea di principio un solo innesco per origine; sul filamento lento serve un nuovo innesco per **ogni frammento di Okazaki**. Negli eucarioti la primasi è associata alla **DNA polimerasi α**, che estende brevemente il primer con DNA.",
      ],
    },
    {
      id: "polimerasi",
      title: "Le DNA polimerasi e la correzione degli errori",
      body: [
        "Le DNA polimerasi leggono lo stampo in direzione 3′→5′ e sintetizzano il nuovo filamento in direzione **5′→3′**, catalizzando l’attacco del 3′-OH al fosfato α del desossiribonucleotide trifosfato in arrivo, con rilascio di pirofosfato.",
        "In *E. coli* la sintesi principale è svolta dalla **DNA polimerasi III**, tenuta sul DNA da un **morsetto scorrevole** (β-clamp); la **DNA polimerasi I** rimuove i primer con la sua attività esonucleasica 5′→3′ e riempie le lacune. Negli eucarioti la polimerasi **ε** copia prevalentemente il filamento guida e la **δ** il filamento lento, entrambe ancorate al morsetto **PCNA**.",
        "L’attività **esonucleasica 3′→5′** di correzione di bozze rimuove il nucleotide sbagliato appena inserito. La selezione delle basi e il proofreading portano l’errore a circa 1 su 10⁷; il **sistema di riparazione dei mismatch** dopo la replicazione lo riduce a circa 1 su 10⁹–10¹⁰.",
      ],
    },
    {
      id: "filamenti",
      title: "Filamento continuo e discontinuo",
      body: [
        "Poiché i due filamenti sono **antiparalleli** e la sintesi procede solo 5′→3′, alla forcella un filamento nuovo può crescere nella stessa direzione in cui la forcella avanza (**filamento guida**, continuo), mentre l’altro deve essere sintetizzato «all’indietro» in brevi tratti (**filamento lento**, discontinuo).",
        "I tratti del filamento lento sono i **frammenti di Okazaki**. Ogni frammento inizia con un primer di RNA e cresce finché non raggiunge il primer del frammento precedente.",
      ],
    },
    {
      id: "maturazione",
      title: "Rimozione dell’RNA e DNA ligasi",
      body: [
        "Gli inneschi di RNA devono essere sostituiti con DNA. Nei batteri lo fa la DNA polimerasi I; negli eucarioti la polimerasi δ sposta il primer, che viene tagliato dalla nucleasi **FEN1** (con un contributo della RNasi H).",
        "Rimane un’**interruzione** (nick) tra il 3′-OH di un frammento e il 5′-fosfato del successivo: la **DNA ligasi** la sigilla formando un legame fosfodiestere, usando ATP (eucarioti) o NAD⁺ (*E. coli*).",
      ],
    },
    {
      id: "telomeri",
      title: "Telomeri, telomerasi e senescenza replicativa",
      body: [
        "Nei cromosomi lineari, quando l’ultimo primer del filamento lento viene rimosso, non esiste un 3′-OH a monte da cui riempire la lacuna: a ogni replicazione l’estremità si accorcia (**problema della replicazione delle estremità**).",
        "I **telomeri** umani sono costituiti da migliaia di ripetizioni **TTAGGG** e terminano con una sporgenza a singolo filamento ripiegata e protetta dal complesso **shelterina**. Fungono da cuscinetto sacrificabile e impediscono che le estremità siano scambiate per rotture del DNA.",
        "La **telomerasi** (subunità catalitica TERT + RNA stampo) allunga l’estremità 3′ ricopiando il proprio stampo: è quindi una **trascrittasi inversa**. È attiva nelle cellule germinali, nelle staminali e in gran parte dei tumori, mentre nella maggior parte delle cellule somatiche è poco o per nulla espressa. Quando i telomeri raggiungono una lunghezza critica si attiva una risposta al danno che porta alla **senescenza replicativa**.",
      ],
      callout: { tone: "info", text: "Elizabeth Blackburn, Carol Greider e Jack Szostak hanno ricevuto il Premio Nobel per la Medicina 2009 per la scoperta di come telomeri e telomerasi proteggono i cromosomi." },
    },
  ],
  objectives: [
    "Spiegare il meccanismo semiconservativo e l’esperimento che lo ha dimostrato.",
    "Descrivere origini di replicazione, complesso d’inizio e forcella replicativa nei procarioti e negli eucarioti.",
    "Illustrare il ruolo di elicasi, topoisomerasi, primasi, DNA polimerasi e DNA ligasi.",
    "Interpretare la sintesi continua e discontinua e la formazione dei frammenti di Okazaki.",
    "Spiegare l’attività di correzione degli errori.",
    "Collegare telomeri, telomerasi e senescenza replicativa.",
  ],
  examples: [
    {
      title: "Perché servono tante origini?",
      body: "Una forcella eucariotica avanza di circa 50 nucleotidi al secondo. Un cromosoma di 150 milioni di paia di basi con una sola origine bidirezionale richiederebbe 150·10⁶ / (2 × 50) = 1,5·10⁶ s, cioè circa 17 giorni. La fase S dura poche ore: senza centinaia di origini per cromosoma non sarebbe possibile.",
    },
    {
      title: "Antibiotici che colpiscono la replicazione batterica",
      body: "I fluorochinoloni bloccano la DNA girasi e la topoisomerasi IV: le forcelle si arrestano e si accumulano rotture del doppio filamento. L’azione è selettiva perché gli enzimi batterici sono strutturalmente diversi dalle topoisomerasi umane.",
    },
    {
      title: "Telomerasi e cancro",
      body: "Le cellule tumorali devono dividersi indefinitamente: nella grande maggioranza dei tumori la telomerasi è riattivata, mentre una minoranza usa un meccanismo alternativo basato sulla ricombinazione (ALT).",
    },
  ],
  conceptMap: {
    nodes: [
      { id: "ori", label: "Origine", group: 0 },
      { id: "eli", label: "Elicasi + SSB", group: 0 },
      { id: "topo", label: "Topoisomerasi", group: 0 },
      { id: "pri", label: "Primasi (RNA)", group: 1 },
      { id: "pol", label: "DNA polimerasi 5′→3′", group: 1 },
      { id: "lead", label: "Filamento guida", group: 2 },
      { id: "lag", label: "Filamento lento", group: 2 },
      { id: "oka", label: "Frammenti di Okazaki", group: 2 },
      { id: "lig", label: "DNA ligasi", group: 3 },
      { id: "telo", label: "Telomeri / telomerasi", group: 3 },
    ],
    edges: [
      { from: "ori", to: "eli", label: "carica" },
      { from: "eli", to: "topo", label: "superavvolgimento risolto da" },
      { from: "eli", to: "pri", label: "espone lo stampo" },
      { from: "pri", to: "pol", label: "fornisce 3′-OH" },
      { from: "pol", to: "lead", label: "sintesi continua" },
      { from: "pol", to: "lag", label: "sintesi discontinua" },
      { from: "lag", to: "oka", label: "genera" },
      { from: "oka", to: "lig", label: "saldati da" },
      { from: "lag", to: "telo", label: "estremità incompleta" },
    ],
  },
  activeRecall: [
    { prompt: "Descrivi il risultato di Meselson e Stahl dopo una e due generazioni in ¹⁴N.", answer: "Dopo una generazione solo DNA a densità intermedia; dopo due, metà intermedio e metà leggero: modello semiconservativo." },
    { prompt: "Perché la DNA polimerasi ha bisogno di un primer?", answer: "Perché può solo aggiungere nucleotidi a un 3′-OH preesistente; la primasi fornisce un innesco di RNA." },
    { prompt: "Qual è la differenza tra topoisomerasi di tipo I e di tipo II?", answer: "Tipo I: taglia un filamento, non richiede ATP. Tipo II: taglia entrambi i filamenti, richiede ATP (es. DNA girasi)." },
    { prompt: "Perché esiste un filamento discontinuo?", answer: "I filamenti sono antiparalleli e la sintesi avviene solo 5′→3′: uno dei due nuovi filamenti deve essere sintetizzato in direzione opposta all’avanzamento della forcella, a frammenti." },
    { prompt: "Cosa fa la DNA ligasi e quale legame forma?", answer: "Sigilla le interruzioni tra frammenti adiacenti formando un legame fosfodiestere." },
    { prompt: "Che tipo di enzima è la telomerasi?", answer: "Una trascrittasi inversa: sintetizza DNA usando come stampo una propria molecola di RNA." },
  ],
  elaborative: [
    { question: "Perché ha senso che gli inneschi siano di RNA e non di DNA?", answer: "La primasi non ha correzione di bozze: un innesco di RNA è riconoscibile come «provvisorio» e viene sostituito da DNA sintetizzato da polimerasi ad alta fedeltà. Così gli errori dell’innesco non restano nel genoma." },
    { question: "Perché una cellula somatica smette di dividersi dopo un certo numero di cicli?", answer: "Senza telomerasi i telomeri si accorciano a ogni replicazione; quando diventano troppo corti vengono riconosciuti come danno al DNA e si attiva un arresto permanente (senescenza), una barriera contro la proliferazione incontrollata." },
    { question: "Perché ogni origine deve attivarsi una sola volta per ciclo?", answer: "Se un’origine si riattivasse, alcune regioni verrebbero copiate più volte (rereplicazione), con amplificazioni e instabilità genomica. La separazione temporale tra carico dell’elicasi (G1) e attivazione (S) lo impedisce." },
  ],
  selfExplanation: [
    { step: "La forcella avanza verso destra; lo stampo superiore è orientato 3′→5′ in quella direzione.", prompt: "Quale nuovo filamento sarà continuo?", modelAnswer: "Quello copiato sullo stampo 3′→5′: il nuovo filamento cresce 5′→3′ nella stessa direzione della forcella, quindi in modo continuo." },
    { step: "Sull’altro stampo la primasi deposita un primer vicino alla forcella.", prompt: "Perché il frammento cresce allontanandosi dalla forcella?", modelAnswer: "La polimerasi procede 5′→3′, cioè in direzione opposta all’avanzamento della forcella su quel filamento: per questo servono frammenti successivi." },
    { step: "Il frammento raggiunge il primer del frammento precedente.", prompt: "Quali due operazioni servono per ottenere un filamento continuo?", modelAnswer: "Rimuovere il primer di RNA sostituendolo con DNA, poi sigillare il nick con la DNA ligasi." },
  ],
  guidedProblems: [
    {
      id: "rep-p1",
      statement: "Batteri cresciuti a lungo in ¹⁵N vengono trasferiti in ¹⁴N. Dopo 3 generazioni, che percentuale di molecole di DNA è ibrida (¹⁵N/¹⁴N)?",
      steps: [
        { hint: "Quante molecole si ottengono da una molecola iniziale dopo 3 generazioni?", result: "2³ = 8 molecole" },
        { hint: "Quanti filamenti pesanti originali esistono? Non si creano né si distruggono.", result: "2 filamenti pesanti, ciascuno in una molecola diversa" },
        { hint: "Quante molecole sono quindi ibride?", result: "2 su 8" },
      ],
      answer: "25% ibride, 75% leggere.",
    },
    {
      id: "rep-p2",
      statement: "Una forcella eucariotica avanza a 50 nt/s. Qual è il numero minimo di origini bidirezionali, equidistanti e attive contemporaneamente, per replicare 150 Mb in 8 ore?",
      steps: [
        { hint: "Converti 8 ore in secondi.", result: "28.800 s" },
        { hint: "Quante basi copia un’origine bidirezionale in quel tempo?", result: "2 × 50 × 28.800 = 2,88·10⁶ nt" },
        { hint: "Dividi la lunghezza del cromosoma per questo valore.", result: "1,5·10⁸ / 2,88·10⁶ ≈ 52" },
      ],
      answer: "Almeno 53 origini; in realtà le origini attivate sono molte di più e non tutte contemporaneamente.",
    },
  ],
  feynman: {
    essentials: [
      { concept: "Semiconservativa", keywords: [["semiconservativ", "un filamento vecchio", "filamento parentale", "filamento originale"]], explanation: "Ogni nuova doppia elica contiene un filamento parentale e uno neosintetizzato." },
      { concept: "Apertura della doppia elica (elicasi)", keywords: [["elicasi", "apre", "separa", "srotola"]], explanation: "L’elicasi separa i filamenti alla forcella; le topoisomerasi eliminano la tensione a monte." },
      { concept: "Innesco di RNA (primasi)", keywords: [["primer", "innesco", "primasi"]], explanation: "La polimerasi ha bisogno di un 3′-OH, fornito da un innesco di RNA." },
      { concept: "Sintesi 5′→3′ da parte della DNA polimerasi", keywords: [["polimerasi"], ["5", "direzione"]], explanation: "La DNA polimerasi aggiunge nucleotidi solo all’estremità 3′, quindi sintetizza 5′→3′." },
      { concept: "Filamento continuo e discontinuo (Okazaki)", keywords: [["okazaki", "discontinu", "lento", "lagging"]], explanation: "Uno dei due filamenti è sintetizzato a frammenti (di Okazaki) perché i filamenti sono antiparalleli." },
      { concept: "Saldatura (ligasi)", keywords: [["ligasi", "salda", "sigilla", "unisce i frammenti"]], explanation: "La DNA ligasi salda i frammenti con legami fosfodiestere." },
      { concept: "Correzione degli errori", keywords: [["corregg", "correzione", "proofreading", "errori", "bozze"]], explanation: "L’attività esonucleasica 3′→5′ della polimerasi rimuove i nucleotidi sbagliati." },
    ],
    misconceptions: [
      { id: "dir-3-5", triggers: [["sintetizz", "costruisce", "aggiunge", "allunga"], ["3' 5", "3’ 5", "3'→5", "3’→5", "da 3 a 5", "3 verso 5"]], excludes: ["legge", "stampo", "esonucleas", "non"], correction: "Nessuna DNA polimerasi sintetizza in direzione 3′→5′: la sintesi avviene sempre 5′→3′. È lo stampo a essere letto 3′→5′; il filamento lento è discontinuo proprio per questo." },
      { id: "primer-dna", triggers: [["primer", "innesco"], ["di dna"]], excludes: ["rna", "non"], correction: "L’innesco sintetizzato dalla primasi è di RNA, non di DNA; solo dopo viene sostituito con DNA." },
      { id: "ligasi-primer", triggers: [["ligasi"], ["rimuove", "elimina", "toglie"]], excludes: ["non"], correction: "La ligasi non rimuove i primer: li rimuovono la DNA polimerasi I (procarioti) o FEN1/RNasi H (eucarioti). La ligasi sigilla i nick." },
      { id: "conservativa", triggers: [["conservativ"]], excludes: ["semiconservativ", "non"], correction: "La replicazione non è conservativa ma semiconservativa: le due eliche figlie contengono ciascuna un filamento parentale." },
      { id: "telomerasi-ovunque", triggers: [["telomerasi"], ["tutte le cellule", "ogni cellula", "sempre attiva"]], excludes: ["non"], correction: "La telomerasi è attiva soprattutto in cellule germinali, staminali e tumorali; nella maggior parte delle cellule somatiche è poco o per nulla espressa." },
    ],
  },
  palaceSuggestions: [
    { concept: "Elicasi", image: "Una cerniera lampo gigante che si apre da sola sul portone d’ingresso." },
    { concept: "Topoisomerasi", image: "Un idraulico che taglia e risalda un tubo attorcigliato sopra la porta." },
    { concept: "Primasi e primer di RNA", image: "Un post-it rosso (provvisorio) attaccato su ogni pagina di un quaderno." },
    { concept: "Frammenti di Okazaki", image: "Mattonelle posate all’indietro lungo il corridoio, una alla volta." },
    { concept: "DNA ligasi", image: "Un vaso di colla sul tavolo del soggiorno che unisce le mattonelle." },
    { concept: "Telomerasi", image: "Un sarto con un rotolo di stoffa (RNA) che riallunga l’orlo di un pantalone." },
  ],
  advanced: [
    {
      title: "Il replisoma eucariotico e l’elicasi CMG",
      body: [
        "Negli eucarioti l’elicasi attiva è il complesso **CMG** (Cdc45–MCM–GINS), che si muove 3′→5′ sul filamento stampo del leading. Nei batteri l’elicasi DnaB si muove invece 5′→3′ sullo stampo del lagging. La logica è identica, l’architettura diversa: un buon esempio di convergenza funzionale.",
      ],
    },
    {
      title: "Replicazione e cromatina",
      body: [
        "Dietro la forcella i nucleosomi vengono riassemblati usando sia istoni parentali sia istoni nuovi: è uno dei punti critici per la trasmissione dell’informazione epigenetica alle cellule figlie (collegamento con l’Unità 2).",
      ],
    },
  ],
  sources: [
    { label: "MUR — Syllabus semestre filtro 2026/27, Biologia, Unità 3", url: "https://www.mur.gov.it/it/news/venerdi-19062026/semestre-aperto-aa-2026-2027", kind: "ufficiale" },
    { label: "OpenStax, Biology 2e — 14.4 DNA Replication in Prokaryotes", url: "https://openstax.org/books/biology-2e/pages/14-4-dna-replication-in-prokaryotes", kind: "manuale" },
    { label: "OpenStax, Biology 2e — 14.5 DNA Replication in Eukaryotes", url: "https://openstax.org/books/biology-2e/pages/14-5-dna-replication-in-eukaryotes", kind: "manuale" },
    { label: "Meselson M., Stahl F.W. (1958). The replication of DNA in Escherichia coli. PNAS 44(7):671–682", doi: "10.1073/pnas.44.7.671", kind: "articolo" },
    { label: "Watson J.D., Crick F.H.C. (1953). Molecular structure of nucleic acids. Nature 171:737–738", doi: "10.1038/171737a0", kind: "articolo" },
    { label: "Premio Nobel per la Medicina 2009 — Blackburn, Greider, Szostak", url: "https://www.nobelprize.org/prizes/medicine/2009/summary/", kind: "risorsa-aperta" },
    { label: "Alberts B. et al., Molecular Biology of the Cell, 4ª ed. (NCBI Bookshelf)", url: "https://www.ncbi.nlm.nih.gov/books/NBK21054/", kind: "manuale" },
  ],
  videoIds: ["yt-Qqe4thU-os8", "yt-8kK2zwjRV0M", "yt-RLYbTwUk1_w"],
  flashcards: [
    { id: "rep-f1", front: "Cosa significa replicazione semiconservativa?", back: "Ogni doppia elica figlia contiene un filamento parentale e uno nuovo." },
    { id: "rep-f2", front: "Chi ha dimostrato la replicazione semiconservativa e come?", back: "Meselson e Stahl (1958): marcatura con ¹⁵N/¹⁴N e centrifugazione in gradiente di CsCl." },
    { id: "rep-f3", front: "Funzione dell’elicasi", back: "Separa i due filamenti rompendo i legami idrogeno, consumando ATP." },
    { id: "rep-f4", front: "Funzione delle topoisomerasi", back: "Risolvono il superavvolgimento a monte della forcella (tipo I: un filamento; tipo II: due filamenti, ATP)." },
    { id: "rep-f5", front: "Perché serve la primasi?", back: "Le DNA polimerasi richiedono un 3′-OH: la primasi sintetizza un innesco di RNA." },
    { id: "rep-f6", front: "Direzione di sintesi delle DNA polimerasi", back: "Sempre 5′→3′ (lo stampo è letto 3′→5′)." },
    { id: "rep-f7", front: "Correzione di bozze", back: "Attività esonucleasica 3′→5′ della DNA polimerasi che rimuove il nucleotide errato appena inserito." },
    { id: "rep-f8", front: "Frammenti di Okazaki: dove e quanto lunghi?", back: "Sul filamento lento; 1000–2000 nt nei procarioti, 100–200 nt negli eucarioti." },
    { id: "rep-f9", front: "Funzione della DNA ligasi", back: "Sigilla i nick formando un legame fosfodiestere (ATP negli eucarioti, NAD⁺ in E. coli)." },
    { id: "rep-f10", front: "Polimerasi replicative eucariotiche", back: "α-primasi (innesco), ε (prevalentemente leading), δ (prevalentemente lagging); morsetto PCNA." },
    { id: "rep-f11", front: "Sequenza ripetuta dei telomeri umani", back: "TTAGGG." },
    { id: "rep-f12", front: "Telomerasi: componenti e tipo di enzima", back: "TERT (trascrittasi inversa) + RNA stampo; allunga l’estremità 3′ dei telomeri." },
  ],
};
