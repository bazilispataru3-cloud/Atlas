import type { Lesson } from "@/lib/types";

export const idrodinamica: Lesson = {
  topicId: "fis-idrodinamica",
  readingMinutes: 28,
  diagram: "venturi",
  intro: [
    "Il cuore pompa circa **5 litri di sangue al minuto**. Lo stesso volume attraversa ogni minuto l’aorta, larga pochi centimetri quadrati, e la rete dei capillari, la cui sezione complessiva supera i mille centimetri quadrati: la velocità del sangue cambia di quasi mille volte. Perché?",
    "La risposta sta in due leggi di conservazione: della **massa** (equazione di continuità) e dell’**energia** (teorema di Bernoulli). In questa lezione le ricavi, le applichi a esercizi numerici e le usi per capire che cosa accade in una **stenosi** e in un **aneurisma**.",
  ],
  fastSummary: [
    "**Portata** Q = volume / tempo = **A · v** (m³/s). Nel sistema circolatorio a riposo Q ≈ 5 L/min.",
    "**Moto stazionario**: in ogni punto la velocità non cambia nel tempo. **Laminare**: il fluido scorre a strati senza mescolarsi. **Turbolento**: vortici e mescolamento (numero di Reynolds elevato).",
    "**Equazione di continuità** (fluido incomprimibile): **A₁v₁ = A₂v₂**. Dove la sezione si restringe la velocità aumenta.",
    "Più condotti in parallelo: conta la **sezione totale**. I capillari, pur stretti, hanno sezione complessiva enorme: lì il sangue è **lentissimo** (≈ 0,03–0,1 cm/s).",
    "**Teorema di Bernoulli** (fluido ideale, moto stazionario, lungo una linea di flusso): **p + ½ρv² + ρgh = costante**.",
    "A quota costante: dove la velocità aumenta la **pressione diminuisce** (effetto Venturi).",
    "**Stenosi**: lume ridotto → v aumenta → pressione laterale cala; il flusso può diventare turbolento (soffio).",
    "**Aneurisma**: lume dilatato → v diminuisce → pressione aumenta → la dilatazione tende a peggiorare (rischio di rottura).",
  ],
  keyConcepts: [
    "Portata Q = A·v",
    "Moto stazionario, laminare e turbolento",
    "Conservazione della massa: A₁v₁ = A₂v₂",
    "Conservazione dell’energia: p + ½ρv² + ρgh = cost.",
    "Effetto Venturi",
    "Stenosi e aneurisma",
  ],
  definitions: [
    { term: "Portata (Q)", definition: "Volume di fluido che attraversa una sezione nell’unità di tempo; Q = A·v, si misura in m³/s (spesso L/min in fisiologia)." },
    { term: "Fluido ideale", definition: "Fluido incomprimibile e privo di viscosità, in moto stazionario e irrotazionale: le ipotesi del teorema di Bernoulli." },
    { term: "Moto laminare", definition: "Moto ordinato a strati paralleli; nei tubi si mantiene per numeri di Reynolds bassi (indicativamente < 2000)." },
    { term: "Numero di Reynolds", definition: "Re = ρvD/η; confronta effetti inerziali e viscosi e indica se un moto tende a essere laminare o turbolento." },
    { term: "Pressione dinamica", definition: "Il termine ½ρv² del teorema di Bernoulli: energia cinetica per unità di volume." },
    { term: "Stenosi", definition: "Restringimento patologico del lume di un vaso o di una valvola." },
    { term: "Aneurisma", definition: "Dilatazione patologica e permanente della parete di un’arteria." },
  ],
  schema: {
    title: "Ragionare su un vaso che cambia sezione",
    steps: [
      { label: "Portata costante", detail: "Q = A·v è uguale in ogni sezione (stesso fluido, stazionario)" },
      { label: "Continuità", detail: "A₂ < A₁ → v₂ > v₁ (e viceversa)" },
      { label: "Bernoulli a quota costante", detail: "p₁ + ½ρv₁² = p₂ + ½ρv₂²" },
      { label: "Conseguenza", detail: "Δp = ½ρ(v₂² − v₁²)" },
      { label: "Clinica", detail: "Stenosi: p ↓, turbolenza · Aneurisma: p ↑, dilatazione" },
    ],
  },
  sections: [
    {
      id: "portata",
      title: "Flusso, portata e tipi di moto",
      body: [
        "La **portata** è il volume che attraversa una sezione nell’unità di tempo. Se il fluido scorre con velocità media v attraverso una sezione di area A, in un tempo Δt percorre un tratto vΔt e attraversa un volume AvΔt: quindi **Q = A·v**.",
        "Il moto è **stazionario** se in ogni punto velocità e pressione non cambiano nel tempo. È **laminare** quando il fluido scorre a strati che non si mescolano, **turbolento** quando compaiono vortici. Per un tubo, il numero di Reynolds Re = ρvD/η aiuta a prevederlo: indicativamente moto laminare sotto 2000 e turbolento sopra circa 3000. Il flusso sanguigno è normalmente laminare; nell’aorta, durante il picco sistolico, può avvicinarsi alla soglia di transizione.",
      ],
    },
    {
      id: "continuita",
      title: "L’equazione di continuità",
      body: [
        "In regime stazionario la massa che entra in un tratto di condotto nell’unità di tempo deve uguagliare quella che esce: ρ₁A₁v₁ = ρ₂A₂v₂. Per un fluido **incomprimibile** (ρ costante, ottima approssimazione per sangue e acqua) si ottiene **A₁v₁ = A₂v₂**.",
        "Se la sezione si dimezza, la velocità raddoppia; se il **raggio** si dimezza, l’area diventa un quarto e la velocità **quadruplica**.",
        "Quando un condotto si divide in molti rami in parallelo, l’equazione vale per la **sezione totale**: Q = A_tot·v. Nei capillari il diametro del singolo vaso è minuscolo, ma la sezione complessiva è centinaia di volte quella dell’aorta: per questo la velocità è minima proprio dove avvengono gli scambi.",
      ],
    },
    {
      id: "bernoulli",
      title: "Il teorema di Bernoulli",
      body: [
        "Per un **fluido ideale** in moto stazionario, lungo una linea di flusso si conserva l’energia per unità di volume: **p + ½ρv² + ρgh = costante**. Il primo termine è la pressione (energia «di pressione»), il secondo la pressione dinamica (energia cinetica), il terzo l’energia potenziale gravitazionale.",
        "Con il fluido fermo (v = 0) il teorema si riduce alla **legge di Stevino**: p₁ − p₂ = ρg(h₂ − h₁). A quota costante, invece, diventa p₁ + ½ρv₁² = p₂ + ½ρv₂²: dove la velocità aumenta la pressione deve diminuire. È l’**effetto Venturi**, usato anche per misurare la velocità di un fluido dalla differenza di pressione tra due sezioni.",
        "Il teorema non vale per i fluidi reali viscosi senza correzioni: lungo un vaso la viscosità dissipa energia e la pressione cala anche a sezione costante. Questo aspetto è descritto dalla **legge di Poiseuille** (argomento successivo del syllabus).",
      ],
    },
    {
      id: "clinica",
      title: "Applicazioni alla circolazione: stenosi e aneurisma",
      body: [
        "In una **stenosi** (ad esempio una placca aterosclerotica) la sezione si riduce: per continuità la velocità aumenta e, per Bernoulli, la pressione laterale sulla parete diminuisce. La pressione esterna può far collassare ulteriormente il tratto, che poi si riapre: si generano vibrazioni e turbolenza udibili con lo stetoscopio come **soffio**.",
        "In un **aneurisma** la sezione aumenta: la velocità diminuisce e la pressione sulla parete aumenta. Per la **legge di Laplace** (T = p·r per un vaso cilindrico) la tensione di parete cresce sia con la pressione sia con il raggio: la parete già indebolita viene sollecitata di più e la dilatazione tende ad autoalimentarsi, con rischio di **rottura**.",
      ],
      callout: { tone: "clinical", text: "Ecocardiografia Doppler: misurando la velocità del getto attraverso una valvola stenotica si stima il gradiente pressorio con la formula semplificata di Bernoulli, Δp ≈ 4v² (Δp in mmHg, v in m/s)." },
    },
  ],
  objectives: [
    "Definire flusso e portata e distinguere moto stazionario, laminare e turbolento.",
    "Applicare l’equazione di continuità come conservazione della massa.",
    "Enunciare e applicare il teorema di Bernoulli nelle sue ipotesi di validità.",
    "Spiegare stenosi e aneurisma con continuità e Bernoulli.",
    "Risolvere esercizi numerici con conversioni di unità (L/min, cm², mmHg, Pa).",
  ],
  examples: [
    {
      title: "Aorta e capillari",
      body: "Q = 5 L/min ≈ 83 cm³/s. Aorta con sezione ≈ 4 cm²: v ≈ 21 cm/s (valore medio; il picco sistolico è molto più alto). Se la sezione totale dei capillari fosse ≈ 2000 cm²: v ≈ 0,04 cm/s. Tempo lento, scambi efficienti.",
    },
    {
      title: "Il gradiente in una stenosi",
      body: "Se il sangue (ρ ≈ 1060 kg/m³) passa da 0,5 m/s a 2,0 m/s: Δp = ½ × 1060 × (2,0² − 0,5²) ≈ 1990 Pa ≈ 15 mmHg di caduta di pressione laterale nel tratto ristretto.",
    },
    {
      title: "Stevino in piedi",
      body: "Tra il cuore e i piedi di una persona in piedi (≈ 1,3 m) la colonna di sangue aggiunge ρgh ≈ 1060 × 9,8 × 1,3 ≈ 13.500 Pa ≈ 100 mmHg: ecco perché la pressione nelle arterie dei piedi è più alta che nell’aorta.",
    },
  ],
  conceptMap: {
    nodes: [
      { id: "q", label: "Portata Q = A·v", group: 0 },
      { id: "cont", label: "Continuità A₁v₁ = A₂v₂", group: 0 },
      { id: "bern", label: "Bernoulli p + ½ρv² + ρgh", group: 1 },
      { id: "stev", label: "Stevino (v = 0)", group: 1 },
      { id: "vent", label: "Effetto Venturi", group: 1 },
      { id: "sten", label: "Stenosi", group: 2 },
      { id: "aneu", label: "Aneurisma", group: 2 },
      { id: "visc", label: "Fluidi reali → Poiseuille", group: 3 },
    ],
    edges: [
      { from: "q", to: "cont", label: "massa conservata" },
      { from: "cont", to: "bern", label: "velocità → pressione" },
      { from: "bern", to: "stev", label: "caso statico" },
      { from: "bern", to: "vent", label: "quota costante" },
      { from: "vent", to: "sten", label: "v ↑ p ↓" },
      { from: "vent", to: "aneu", label: "v ↓ p ↑" },
      { from: "bern", to: "visc", label: "limite: viscosità" },
    ],
  },
  activeRecall: [
    { prompt: "Scrivi l’equazione di continuità e la condizione per cui vale in quella forma.", answer: "A₁v₁ = A₂v₂, per un fluido incomprimibile in moto stazionario." },
    { prompt: "Scrivi il teorema di Bernoulli e le ipotesi.", answer: "p + ½ρv² + ρgh = cost.; fluido ideale (incomprimibile, non viscoso), moto stazionario, lungo una linea di flusso." },
    { prompt: "Se il raggio di un vaso si dimezza, come cambia la velocità?", answer: "L’area diventa 1/4: la velocità quadruplica." },
    { prompt: "Dove il sangue è più lento: aorta o capillari? Perché?", answer: "Nei capillari, perché la loro sezione totale è molto maggiore di quella dell’aorta." },
    { prompt: "Cosa succede alla pressione laterale in una stenosi?", answer: "Diminuisce, perché la velocità aumenta (Bernoulli a quota costante)." },
  ],
  elaborative: [
    { question: "Perché la pressione cala dove il fluido accelera?", answer: "Per accelerare, una porzione di fluido deve essere spinta da una pressione maggiore alle spalle che davanti: la regione ad alta velocità è necessariamente a pressione minore. In termini energetici, energia di pressione si converte in energia cinetica." },
    { question: "Perché in un aneurisma la situazione tende a peggiorare?", answer: "La dilatazione rallenta il sangue e aumenta la pressione locale; per Laplace la tensione di parete cresce con pressione e raggio, quindi la parete si dilata ancora: un circolo vizioso." },
    { question: "Perché Bernoulli non basta a descrivere il circolo reale?", answer: "Il sangue è viscoso: parte dell’energia si dissipa per attrito interno, quindi la pressione diminuisce lungo i vasi anche a sezione costante. Serve la legge di Poiseuille." },
  ],
  selfExplanation: [
    { step: "Q = 5 L/min = 5000 cm³ / 60 s ≈ 83 cm³/s.", prompt: "Perché convertire in cm³/s?", modelAnswer: "Per avere unità coerenti con l’area in cm² e ottenere la velocità in cm/s." },
    { step: "v = Q/A = 83 / 4 ≈ 21 cm/s.", prompt: "Cosa rappresenta questo valore?", modelAnswer: "Una velocità media nel tempo e sulla sezione: il flusso è pulsatile e il profilo di velocità non è uniforme." },
    { step: "p₁ − p₂ = ½ρ(v₂² − v₁²)", prompt: "Da quale equazione deriva e con quale ipotesi su h?", modelAnswer: "Dal teorema di Bernoulli, assumendo che le due sezioni siano alla stessa quota (ρgh si semplifica)." },
  ],
  guidedProblems: [
    {
      id: "idro-p1",
      statement: "Un’arteria di raggio 4 mm presenta una stenosi con raggio 2 mm. Se la velocità a monte è 0,30 m/s, calcola la velocità nella stenosi e la differenza di pressione (ρ = 1060 kg/m³), trascurando la viscosità.",
      steps: [
        { hint: "Rapporto tra le aree: dipende dal quadrato del raggio.", result: "A₁/A₂ = (4/2)² = 4" },
        { hint: "Continuità.", result: "v₂ = 4 × 0,30 = 1,2 m/s" },
        { hint: "Bernoulli a quota costante.", result: "Δp = ½ × 1060 × (1,2² − 0,30²) = 530 × 1,35 ≈ 716 Pa" },
        { hint: "Converti in mmHg (1 mmHg = 133,3 Pa).", result: "≈ 5,4 mmHg" },
      ],
      answer: "v₂ = 1,2 m/s; la pressione nella stenosi è inferiore di ≈ 716 Pa (≈ 5,4 mmHg).",
    },
    {
      id: "idro-p2",
      statement: "Da un foro posto 20 cm sotto il pelo libero di un recipiente aperto esce acqua. Con che velocità? (g = 9,8 m/s²)",
      steps: [
        { hint: "Applica Bernoulli tra il pelo libero (v ≈ 0, p = p_atm) e il foro (p = p_atm).", result: "ρgh = ½ρv²" },
        { hint: "Isola v.", result: "v = √(2gh) (teorema di Torricelli)" },
      ],
      answer: "v = √(2 × 9,8 × 0,20) ≈ 1,98 m/s.",
    },
  ],
  feynman: {
    essentials: [
      { concept: "Portata = area × velocità", keywords: [["portata"], ["area", "sezione", "velocit"]], explanation: "Q = A·v: il volume che passa nell’unità di tempo." },
      { concept: "Continuità: sezione minore, velocità maggiore", keywords: [["continuit", "a1v1", "a1 v1", "si restringe", "stretto", "sezione minore"], ["veloc"]], explanation: "A₁v₁ = A₂v₂: dove il condotto si restringe il fluido accelera." },
      { concept: "Bernoulli: conservazione dell’energia", keywords: [["bernoulli", "energia"]], explanation: "p + ½ρv² + ρgh = cost. lungo una linea di flusso." },
      { concept: "Più velocità → meno pressione", keywords: [["pressione"], ["diminuisc", "cala", "minore", "scende", "piu bassa"]], explanation: "A quota costante, all’aumentare della velocità la pressione diminuisce." },
      { concept: "Ipotesi: fluido ideale", keywords: [["ideale", "non viscos", "incomprimibil", "senza attrito"]], explanation: "Il teorema vale per fluidi ideali in moto stazionario." },
      { concept: "Applicazione: stenosi o aneurisma", keywords: [["stenosi", "aneurisma", "arteri", "vaso"]], explanation: "Stenosi: v ↑ p ↓. Aneurisma: v ↓ p ↑." },
    ],
    misconceptions: [
      { id: "stretto-pressione", triggers: [["stenosi", "restring", "stretto", "stretta"], ["pressione aumenta", "aumenta la pressione", "pressione maggiore", "maggiore pressione", "pressione sale", "pressione cresce", "pressione piu alta"]], excludes: ["aneurisma", "non", "dilata"], correction: "Nel tratto ristretto la pressione laterale diminuisce, non aumenta: è la velocità ad aumentare." },
      { id: "capillari-veloci", triggers: [["capillar"], ["piu veloc", "velocita maggiore", "molto veloce", "accelera"]], excludes: ["non", "lent"], correction: "Nei capillari il sangue è più lento, non più veloce: conta la sezione totale del letto capillare, che è enorme." },
      { id: "bernoulli-reale", triggers: [["bernoulli"], ["sempre", "qualsiasi fluido", "tutti i fluidi", "fluidi reali"]], excludes: ["non", "ideal"], correction: "Il teorema di Bernoulli vale per fluidi ideali; nei fluidi reali la viscosità dissipa energia (legge di Poiseuille)." },
      { id: "portata-velocita", triggers: [["portata"], ["velocita", "stessa cosa", "uguale alla velocit"]], excludes: ["area", "sezione", "per", "×", "non"], correction: "Portata e velocità non coincidono: Q = A·v. A portata costante, la velocità dipende dalla sezione." },
    ],
  },
  palaceSuggestions: [
    { concept: "Q = A·v", image: "Un tubo da giardino all’ingresso: quando schiacci la punta (A ↓) il getto schizza lontano (v ↑)." },
    { concept: "p + ½ρv² + ρgh = cost.", image: "Tre secchi in fila in cucina: travasando l’acqua dall’uno all’altro, il totale non cambia." },
    { concept: "Stenosi", image: "Un corridoio che si stringe: la folla accelera e le pareti smettono di essere spinte." },
    { concept: "Aneurisma", image: "Un palloncino che si gonfia sul divano: più è largo, più facilmente scoppia." },
  ],
  advanced: [
    {
      title: "Dalla conservazione dell’energia a Bernoulli",
      body: [
        "Considera un tubo di flusso tra le sezioni 1 e 2. In un tempo Δt la pressione compie sul fluido il lavoro W = p₁A₁Δx₁ − p₂A₂Δx₂ = (p₁ − p₂)ΔV, dove ΔV è lo stesso per continuità. Questo lavoro è uguale alla variazione di energia cinetica ½Δm(v₂² − v₁²) più quella potenziale Δm·g(h₂ − h₁). Dividendo per ΔV (Δm/ΔV = ρ) si ottiene il teorema.",
      ],
    },
    {
      title: "Profilo di velocità e flusso pulsatile",
      body: [
        "Nel circolo reale il flusso è pulsatile e il profilo di velocità in un vaso non è uniforme (parabolico nel moto laminare stazionario, più appiattito nell’aorta). I modelli emodinamici avanzati usano il numero di Womersley per descrivere l’effetto della pulsatilità. Contenuto oltre il syllabus.",
      ],
    },
  ],
  sources: [
    { label: "MUR — Syllabus semestre filtro 2026/27, Fisica, Unità 3", url: "https://www.mur.gov.it/it/news/venerdi-19062026/semestre-aperto-aa-2026-2027", kind: "ufficiale" },
    { label: "OpenStax, College Physics 2e — 12.1 Flow Rate and Its Relation to Velocity", url: "https://openstax.org/books/college-physics-2e/pages/12-1-flow-rate-and-its-relation-to-velocity", kind: "manuale" },
    { label: "OpenStax, College Physics 2e — 12.2 Bernoulli’s Equation", url: "https://openstax.org/books/college-physics-2e/pages/12-2-bernoullis-equation", kind: "manuale" },
  ],
  videoIds: ["yt-fJefjG3xhW0", "yt-b5SqYuWT4-4", "yt-lfXDJKKPGfY", "yt-gYpokkRFvO8", "yt-F2uzWHppVrk", "yt-cQlskaOmR6I"],
  flashcards: [
    { id: "idro-f1", front: "Definizione di portata", back: "Volume per unità di tempo: Q = A·v (m³/s)." },
    { id: "idro-f2", front: "Equazione di continuità", back: "A₁v₁ = A₂v₂ (fluido incomprimibile, moto stazionario)." },
    { id: "idro-f3", front: "Teorema di Bernoulli", back: "p + ½ρv² + ρgh = costante lungo una linea di flusso (fluido ideale, stazionario)." },
    { id: "idro-f4", front: "Ipotesi del teorema di Bernoulli", back: "Fluido incomprimibile, non viscoso, moto stazionario, lungo una linea di flusso." },
    { id: "idro-f5", front: "Effetto Venturi", back: "A quota costante, dove la velocità aumenta la pressione diminuisce." },
    { id: "idro-f6", front: "Stenosi: velocità e pressione", back: "Velocità ↑, pressione laterale ↓; possibile turbolenza (soffio)." },
    { id: "idro-f7", front: "Aneurisma: velocità e pressione", back: "Velocità ↓, pressione ↑; tensione di parete ↑ (Laplace) → rischio rottura." },
    { id: "idro-f8", front: "Numero di Reynolds", back: "Re = ρvD/η; nei tubi laminare sotto ~2000, turbolento sopra ~3000." },
    { id: "idro-f9", front: "Teorema di Torricelli", back: "v = √(2gh) per l’efflusso da un foro a profondità h." },
    { id: "idro-f10", front: "Dove è più lento il sangue e perché", back: "Nei capillari: la sezione totale del letto capillare è massima." },
  ],
};
