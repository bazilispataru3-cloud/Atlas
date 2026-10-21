import type { Lesson } from "@/lib/types";

export const radioattivita: Lesson = {
  topicId: "fis-radioattivita",
  readingMinutes: 24,
  diagram: "decay-curve",
  intro: [
    "Ogni giorno in ospedale si iniettano piccole quantità di sostanze radioattive per ottenere immagini (scintigrafia, PET) o per curare (terapia con iodio-131). Per usarle in sicurezza bisogna saper rispondere a una domanda quantitativa: **quanta attività resta dopo un certo tempo?**",
    "In questa lezione definisci **nucleo instabile**, **attività** ed **emivita**, ricavi la **legge del decadimento radioattivo** e impari a bilanciare le trasformazioni nucleari dei decadimenti **alfa, beta e gamma**.",
  ],
  fastSummary: [
    "Un **nucleo instabile** si trasforma spontaneamente emettendo radiazione; gli **isotopi radioattivi** (radionuclidi) hanno lo stesso Z dell’elemento ma un diverso numero di neutroni.",
    "Il decadimento è **casuale** per il singolo nucleo ma segue una legge statistica precisa: **N(t) = N₀ · e^(−λt)**.",
    "**Attività** A = λN: numero di decadimenti al secondo, in **becquerel** (1 Bq = 1 s⁻¹). Anche l’attività decresce esponenzialmente: A(t) = A₀ · e^(−λt).",
    "**Emivita** T½ = ln 2 / λ ≈ 0,693/λ: dopo n emivite resta la frazione **(1/2)ⁿ**. Non dipende dalla quantità iniziale né da temperatura o pressione.",
    "**Alfa** (nucleo di ⁴He): A − 4, Z − 2. Poco penetrante (fermata da un foglio di carta), molto ionizzante.",
    "**Beta meno** (n → p + e⁻ + antineutrino): Z + 1, A invariato. **Beta più** (p → n + e⁺ + neutrino): Z − 1, A invariato.",
    "**Gamma**: fotoni emessi da un nucleo eccitato; A e Z non cambiano. Molto penetranti: si attenuano con spessori di piombo o calcestruzzo.",
    "Esempi medici: **⁹⁹ᵐTc** (γ, T½ ≈ 6 h, scintigrafia), **¹⁸F** (β⁺, T½ ≈ 110 min, PET), **¹³¹I** (β⁻ e γ, T½ ≈ 8 giorni, tiroide).",
  ],
  keyConcepts: [
    "Nucleo instabile e radionuclidi",
    "Legge del decadimento N = N₀e^(−λt)",
    "Attività (Bq) e costante di decadimento",
    "Emivita e vita media",
    "Decadimenti α, β⁻, β⁺, γ e conservazione di A e Z",
    "Penetrazione e ionizzazione delle diverse radiazioni",
  ],
  definitions: [
    { term: "Radionuclide", definition: "Nuclide instabile che decade spontaneamente emettendo radiazione." },
    { term: "Costante di decadimento (λ)", definition: "Probabilità di decadimento di un nucleo per unità di tempo (s⁻¹)." },
    { term: "Attività", definition: "Numero di decadimenti per unità di tempo, A = λN; unità SI: becquerel (Bq). Unità storica: curie (1 Ci = 3,7·10¹⁰ Bq)." },
    { term: "Emivita (T½)", definition: "Tempo dopo il quale si è dimezzato il numero di nuclei radioattivi (e quindi l’attività): T½ = ln 2/λ." },
    { term: "Vita media (τ)", definition: "Tempo medio di sopravvivenza di un nucleo: τ = 1/λ = T½/ln 2 ≈ 1,44 T½." },
    { term: "Stato metastabile", definition: "Stato eccitato del nucleo a vita relativamente lunga (indicato con «m», es. ⁹⁹ᵐTc) che si diseccita emettendo un fotone γ." },
  ],
  schema: {
    title: "Risolvere un problema di decadimento",
    steps: [
      { label: "Identifica i dati", detail: "A₀ o N₀, T½ (o λ), tempo t — stesse unità di tempo!" },
      { label: "Conta le emivite", detail: "n = t / T½" },
      { label: "Applica la legge", detail: "A = A₀ · (1/2)ⁿ = A₀ · e^(−λt)" },
      { label: "Se serve λ", detail: "λ = ln 2 / T½" },
      { label: "Se serve N", detail: "N = A / λ (λ in s⁻¹ se A in Bq)" },
    ],
  },
  sections: [
    {
      id: "nucleo",
      title: "Nuclei stabili e instabili",
      body: [
        "Il nucleo è formato da Z protoni e N neutroni (numero di massa A = Z + N), tenuti insieme dalla **forza nucleare forte**, che a brevissima distanza prevale sulla repulsione elettrica tra i protoni. Solo alcune combinazioni di Z e N sono stabili: nei nuclei leggeri N ≈ Z, in quelli pesanti servono più neutroni che protoni.",
        "I nuclei con un eccesso di neutroni, di protoni o di energia sono **instabili** e tendono a trasformarsi. Gli isotopi instabili di un elemento sono detti **radioattivi**: ad esempio il carbonio-12 è stabile, il carbonio-14 no.",
      ],
    },
    {
      id: "legge",
      title: "La legge del decadimento radioattivo",
      body: [
        "Non si può prevedere quando decadrà un singolo nucleo: ogni nucleo ha la stessa probabilità λ di decadere nell’unità di tempo, indipendentemente da quanto «ha già vissuto». Su un grande numero di nuclei, il numero di decadimenti nell’intervallo dt è proporzionale ai nuclei presenti: dN = −λN dt.",
        "Integrando si ottiene la **legge del decadimento**: **N(t) = N₀ · e^(−λt)**. L’**attività** A = λN segue la stessa legge: **A(t) = A₀ · e^(−λt)**. Si misura in **becquerel** (1 decadimento al secondo).",
        "L’**emivita** è il tempo dopo cui N (e A) si dimezza: ponendo N = N₀/2 si ricava **T½ = ln 2/λ**. Dopo 1, 2, 3, … emivite resta 1/2, 1/4, 1/8, … del valore iniziale: in generale **(1/2)^(t/T½)**. Le emivite vanno da frazioni di secondo a miliardi di anni e non dipendono dalla quantità iniziale.",
      ],
      callout: { tone: "info", text: "Dopo 10 emivite resta circa 1/1000 dell’attività iniziale (1/1024): una regola pratica usata nella gestione dei rifiuti radioattivi a breve emivita." },
    },
    {
      id: "decadimenti",
      title: "Tipi di decadimento e trasformazioni nucleari",
      body: [
        "In ogni decadimento si conservano il **numero di massa** totale e la **carica** totale: la somma degli A e degli Z a sinistra è uguale a quella a destra.",
        "**Decadimento α**: il nucleo emette una particella α (nucleo di elio, 2 protoni e 2 neutroni). Es. ²²⁶₈₈Ra → ²²²₈₆Rn + ⁴₂He. Tipico dei nuclei pesanti.",
        "**Decadimento β⁻**: un neutrone si trasforma in un protone, un elettrone e un antineutrino; l’elettrone emesso nasce nel nucleo, non proviene dagli orbitali. Es. ¹⁴₆C → ¹⁴₇N + e⁻ + ν̄. Tipico dei nuclei con eccesso di neutroni.",
        "**Decadimento β⁺**: un protone si trasforma in un neutrone, un positrone e un neutrino. Es. ¹⁸₉F → ¹⁸₈O + e⁺ + ν. Il positrone si annichila con un elettrone producendo **due fotoni da 511 keV** emessi in direzioni opposte: è il principio della **PET**.",
        "**Emissione γ**: un nucleo in uno stato eccitato passa a uno stato di energia inferiore emettendo un fotone, spesso dopo un decadimento α o β. A e Z non cambiano. Es. ⁹⁹ᵐTc → ⁹⁹Tc + γ (140 keV).",
      ],
    },
    {
      id: "penetrazione",
      title: "Penetrazione e potere ionizzante",
      body: [
        "Le particelle **α** hanno carica +2 e grande massa: cedono rapidamente energia ionizzando densamente la materia e si fermano in pochi centimetri d’aria o in un foglio di carta. Sono poco pericolose dall’esterno ma molto se il radionuclide viene **inalato o ingerito**.",
        "Le particelle **β** penetrano qualche millimetro nei tessuti e sono fermate da pochi millimetri di plastica o alluminio. I **γ**, privi di carica e massa, sono molto penetranti: non vengono «fermati» ma attenuati esponenzialmente da spessori di materiali densi come il piombo.",
      ],
      callout: { tone: "clinical", text: "Lo iodio-131 si concentra nella tiroide: le particelle β⁻ distruggono localmente il tessuto (terapia dell’ipertiroidismo e di alcuni tumori tiroidei), mentre i fotoni γ permettono di visualizzarne la distribuzione." },
    },
  ],
  objectives: [
    "Definire nucleo instabile e isotopo radioattivo.",
    "Applicare la legge del decadimento radioattivo e il concetto di attività.",
    "Calcolare emivita, costante di decadimento e attività residua.",
    "Descrivere i decadimenti α, β e γ e bilanciare le trasformazioni nucleari associate.",
  ],
  examples: [
    {
      title: "Una dose di tecnezio per la scintigrafia",
      body: "Alle 8:00 si preparano 800 MBq di ⁹⁹ᵐTc (T½ ≈ 6 h). Alle 20:00 sono passate 2 emivite: restano 800 × (1/2)² = 200 MBq. Dopo 24 h (4 emivite) resta il 6,25%: 50 MBq.",
    },
    {
      title: "Perché la PET si fa vicino a un ciclotrone",
      body: "Il fluoro-18 ha T½ ≈ 110 minuti: dopo 3 ore e mezza circa (≈ 2 emivite) è rimasto solo un quarto dell’attività. Il radiofarmaco va prodotto e trasportato rapidamente.",
    },
  ],
  conceptMap: {
    nodes: [
      { id: "inst", label: "Nucleo instabile", group: 0 },
      { id: "lam", label: "λ (probabilità/tempo)", group: 1 },
      { id: "legge", label: "N = N₀e^(−λt)", group: 1 },
      { id: "att", label: "Attività A = λN (Bq)", group: 1 },
      { id: "t12", label: "T½ = ln2/λ", group: 1 },
      { id: "alfa", label: "α: A−4, Z−2", group: 2 },
      { id: "beta", label: "β⁻: Z+1 · β⁺: Z−1", group: 2 },
      { id: "gamma", label: "γ: A, Z invariati", group: 2 },
      { id: "med", label: "Medicina nucleare", group: 3 },
    ],
    edges: [
      { from: "inst", to: "lam", label: "decade con" },
      { from: "lam", to: "legge", label: "statistica" },
      { from: "legge", to: "att", label: "derivata" },
      { from: "lam", to: "t12", label: "definisce" },
      { from: "inst", to: "alfa", label: "modi" },
      { from: "inst", to: "beta", label: "modi" },
      { from: "inst", to: "gamma", label: "modi" },
      { from: "t12", to: "med", label: "scelta del tracciante" },
    ],
  },
  activeRecall: [
    { prompt: "Scrivi la legge del decadimento e la relazione tra emivita e λ.", answer: "N = N₀e^(−λt); T½ = ln 2/λ." },
    { prompt: "Che frazione resta dopo 3 emivite?", answer: "(1/2)³ = 1/8 = 12,5%." },
    { prompt: "Come cambiano A e Z nel decadimento α, β⁻, β⁺ e γ?", answer: "α: A−4, Z−2; β⁻: A uguale, Z+1; β⁺: A uguale, Z−1; γ: invariati." },
    { prompt: "Che cos’è il becquerel?", answer: "L’unità SI di attività: un decadimento al secondo." },
    { prompt: "Quale radiazione è la meno penetrante e quale la più penetrante?", answer: "La α è la meno penetrante, la γ la più penetrante." },
  ],
  elaborative: [
    { question: "Perché l’emivita non dipende dalla quantità di materiale?", answer: "Perché λ è una proprietà del singolo nucleo: la frazione che decade in un dato tempo è sempre la stessa, che i nuclei siano mille o mille miliardi." },
    { question: "Perché nel decadimento β⁻ il numero atomico aumenta?", answer: "Un neutrone del nucleo diventa un protone: il numero di protoni aumenta di 1 mentre il numero totale di nucleoni (A) resta uguale." },
    { question: "Perché per la diagnostica si preferiscono emettitori γ con emivita di ore?", answer: "I fotoni γ escono dal corpo e raggiungono il rivelatore; un’emivita di ore basta per l’esame ma limita la dose al paziente e la durata della contaminazione." },
  ],
  selfExplanation: [
    { step: "t = 24 h, T½ = 6 h → n = 4.", prompt: "Perché si divide t per T½?", modelAnswer: "Per contare quante volte l’attività si è dimezzata nel tempo trascorso." },
    { step: "A = A₀ · (1/2)⁴ = A₀/16.", prompt: "Che percentuale è?", modelAnswer: "6,25% dell’attività iniziale." },
    { step: "λ = 0,693 / (6 h × 3600 s/h) ≈ 3,2·10⁻⁵ s⁻¹.", prompt: "Perché convertire in secondi?", modelAnswer: "Perché l’attività in Bq è in s⁻¹: per ricavare N = A/λ le unità devono essere coerenti." },
  ],
  guidedProblems: [
    {
      id: "rad-p1",
      statement: "Quanto tempo serve perché l’attività di un campione di ¹³¹I (T½ = 8,0 giorni) scenda al 10% del valore iniziale?",
      steps: [
        { hint: "Imposta (1/2)^(t/T½) = 0,10.", result: "t/T½ = log₂(10)" },
        { hint: "log₂(10) = ln 10 / ln 2.", result: "≈ 3,32" },
        { hint: "Moltiplica per T½.", result: "3,32 × 8,0 giorni" },
      ],
      answer: "≈ 27 giorni.",
    },
    {
      id: "rad-p2",
      statement: "Il ²³⁸₉₂U decade α; il prodotto decade β⁻. Scrivi i due nuclidi prodotti (Th: Z = 90; Pa: Z = 91).",
      steps: [
        { hint: "Decadimento α: A − 4, Z − 2.", result: "²³⁴₉₀Th" },
        { hint: "Decadimento β⁻: A invariato, Z + 1.", result: "²³⁴₉₁Pa" },
      ],
      answer: "²³⁸U → ²³⁴Th + α; ²³⁴Th → ²³⁴Pa + e⁻ + ν̄.",
    },
    {
      id: "rad-p3",
      statement: "Quanti nuclei di ⁹⁹ᵐTc (T½ = 6,0 h) corrispondono a un’attività di 1,0 MBq?",
      steps: [
        { hint: "Calcola λ in s⁻¹.", result: "λ = 0,693 / 21.600 s ≈ 3,2·10⁻⁵ s⁻¹" },
        { hint: "N = A/λ.", result: "1,0·10⁶ / 3,2·10⁻⁵" },
      ],
      answer: "N ≈ 3,1·10¹⁰ nuclei.",
    },
  ],
  feynman: {
    essentials: [
      { concept: "Nucleo instabile che si trasforma spontaneamente", keywords: [["instabil", "spontane"]], explanation: "I nuclei instabili decadono spontaneamente emettendo radiazione." },
      { concept: "Legge esponenziale / probabilità costante", keywords: [["esponenzial", "e^", "probabilit", "casual"]], explanation: "Ogni nucleo ha la stessa probabilità di decadere: N = N₀e^(−λt)." },
      { concept: "Emivita: tempo di dimezzamento", keywords: [["emivit", "dimezz", "meta"]], explanation: "Dopo un’emivita resta metà dei nuclei; dopo n emivite (1/2)ⁿ." },
      { concept: "Attività in becquerel", keywords: [["attivit", "becquerel", "bq", "decadimenti al secondo"]], explanation: "L’attività è il numero di decadimenti al secondo, A = λN." },
      { concept: "Tipi di decadimento (α, β, γ)", keywords: [["alfa", "α"], ["beta", "β"], ["gamma", "γ"]], explanation: "α: A−4, Z−2; β⁻: Z+1; β⁺: Z−1; γ: A e Z invariati." },
    ],
    misconceptions: [
      { id: "due-emivite", triggers: [["due emivite", "2 emivite", "dopo due", "doppio dell'emivita"], ["tutto", "completamente", "zero", "nulla", "esaurit"]], excludes: ["non", "quarto", "25"], correction: "Dopo due emivite non è decaduto tutto: resta un quarto (25%) dei nuclei." },
      { id: "dipende-quantita", triggers: [["emivita"], ["dipende dalla quantita", "dipende dalla massa", "piu materiale", "piu lunga se"]], excludes: ["non"], correction: "L’emivita non dipende dalla quantità iniziale: è una proprietà del radionuclide." },
      { id: "elettrone-orbitale", triggers: [["beta"], ["orbital", "nuvola elettronica", "elettroni esterni"]], excludes: ["non"], correction: "Nel decadimento β⁻ l’elettrone nasce nel nucleo dalla trasformazione di un neutrone in protone; non proviene dagli orbitali." },
      { id: "gamma-z", triggers: [["gamma", "γ"], ["cambia il numero atomico", "cambia z", "diminuisce z", "aumenta z", "cambia elemento"]], excludes: ["non"], correction: "L’emissione γ non cambia né Z né A: il nucleo passa solo a uno stato di energia inferiore." },
      { id: "alfa-penetrante", triggers: [["alfa", "α"], ["piu penetrant", "molto penetrant", "attraversa il corpo"]], excludes: ["non", "meno"], correction: "La radiazione α è la meno penetrante (si ferma con un foglio di carta); è pericolosa soprattutto se il radionuclide viene inalato o ingerito." },
    ],
  },
  palaceSuggestions: [
    { concept: "Emivita", image: "Una torta sul tavolo d’ingresso che ogni ora viene tagliata a metà." },
    { concept: "Decadimento α", image: "Un pacchetto di 4 palline (2 rosse, 2 blu) lanciato fuori dalla finestra della cucina." },
    { concept: "Decadimento β⁻", image: "Un neutrone grigio che si dipinge di rosso (protone) e sputa un elettrone." },
    { concept: "PET e β⁺", image: "Due raggi laser che partono in direzioni opposte dal centro della camera." },
  ],
  advanced: [
    {
      title: "Emivita efficace in medicina nucleare",
      body: [
        "Nel corpo un radiofarmaco scompare sia per decadimento fisico sia per eliminazione biologica. Le due costanti si sommano: λ_eff = λ_fis + λ_biol, cioè 1/T_eff = 1/T_fis + 1/T_biol. L’emivita efficace è sempre più breve di entrambe. Contenuto oltre il syllabus, utile per i corsi di radiologia.",
      ],
    },
    {
      title: "Dose assorbita e dose equivalente",
      body: [
        "L’energia depositata per unità di massa si misura in gray (1 Gy = 1 J/kg); per tenere conto della diversa efficacia biologica delle radiazioni si usa la dose equivalente in sievert, che pesa di più le particelle α rispetto a fotoni ed elettroni. Concetti di radioprotezione non esplicitamente richiesti dal syllabus.",
      ],
    },
  ],
  sources: [
    { label: "MUR — Syllabus semestre filtro 2026/27, Fisica, Unità 7", url: "https://www.mur.gov.it/it/news/venerdi-19062026/semestre-aperto-aa-2026-2027", kind: "ufficiale" },
    { label: "OpenStax, College Physics 2e — 31.4 Nuclear Decay and Conservation Laws", url: "https://openstax.org/books/college-physics-2e/pages/31-4-nuclear-decay-and-conservation-laws", kind: "manuale" },
    { label: "OpenStax, College Physics 2e — 31.5 Half-Life and Activity", url: "https://openstax.org/books/college-physics-2e/pages/31-5-half-life-and-activity", kind: "manuale" },
    { label: "NuDat 3 — National Nuclear Data Center (dati di emivita dei nuclidi)", url: "https://www.nndc.bnl.gov/nudat3/", kind: "risorsa-aperta" },
  ],
  videoIds: ["yt-lUhJL7o6_cA", "yt-gDpyBifg6-s", "yt-P_SD5Rt6XMk", "yt-z_xyx-z6arc", "yt-jJSwWRaU9rA"],
  flashcards: [
    { id: "rad-f1", front: "Legge del decadimento radioattivo", back: "N(t) = N₀ · e^(−λt)." },
    { id: "rad-f2", front: "Relazione tra emivita e costante di decadimento", back: "T½ = ln 2/λ ≈ 0,693/λ." },
    { id: "rad-f3", front: "Definizione di attività e unità", back: "A = λN, decadimenti al secondo; becquerel (Bq)." },
    { id: "rad-f4", front: "Frazione residua dopo n emivite", back: "(1/2)ⁿ." },
    { id: "rad-f5", front: "Decadimento α: variazione di A e Z", back: "A − 4, Z − 2 (emissione di un nucleo di ⁴He)." },
    { id: "rad-f6", front: "Decadimento β⁻: cosa succede nel nucleo", back: "n → p + e⁻ + ν̄: Z + 1, A invariato." },
    { id: "rad-f7", front: "Decadimento β⁺ e PET", back: "p → n + e⁺ + ν; il positrone si annichila → 2 fotoni da 511 keV in direzioni opposte." },
    { id: "rad-f8", front: "Emissione γ", back: "Fotone da un nucleo eccitato: A e Z invariati." },
    { id: "rad-f9", front: "Emivita di ⁹⁹ᵐTc, ¹⁸F, ¹³¹I", back: "≈ 6 h; ≈ 110 min; ≈ 8 giorni." },
    { id: "rad-f10", front: "Vita media", back: "τ = 1/λ = T½/ln 2 ≈ 1,44 T½." },
  ],
};
