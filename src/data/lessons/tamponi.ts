import type { Lesson } from "@/lib/types";

export const tamponi: Lesson = {
  topicId: "chim-tamponi",
  readingMinutes: 28,
  diagram: "buffer-curve",
  intro: [
    "Il pH del sangue arterioso è mantenuto tra **7,35 e 7,45**: uno scostamento di pochi decimi è già una condizione clinica (acidosi o alcalosi). Eppure il metabolismo produce ogni giorno grandi quantità di acidi, a partire dalla CO₂.",
    "Il primo argine sono le **soluzioni tampone**. In questa lezione capisci come funzionano, ricavi l’**equazione di Henderson-Hasselbalch**, impari a valutare **intervallo ed efficienza** di un tampone e applichi tutto al sistema **CO₂/bicarbonato** del plasma.",
  ],
  fastSummary: [
    "Un **tampone** è una soluzione di un **acido debole e della sua base coniugata** (o di una base debole e del suo acido coniugato) in concentrazioni paragonabili: **limita** le variazioni di pH dovute all’aggiunta di piccole quantità di acido o base forte.",
    "Funzionamento: la base coniugata A⁻ neutralizza gli H₃O⁺ aggiunti; l’acido HA neutralizza gli OH⁻ aggiunti.",
    "**Henderson-Hasselbalch**: pH = pKa + log([A⁻]/[HA]). Quando [A⁻] = [HA], **pH = pKa**.",
    "Intervallo utile: circa **pKa ± 1** (rapporto [A⁻]/[HA] tra 0,1 e 10).",
    "L’**efficienza** (capacità tamponante) è massima a pH = pKa e cresce con la **concentrazione totale** del tampone. La diluizione lascia quasi invariato il pH ma riduce la capacità.",
    "Plasma: pH = 6,1 + log([HCO₃⁻] / (0,03 · pCO₂)). Con [HCO₃⁻] = 24 mM e pCO₂ = 40 mmHg il rapporto è 20 → **pH ≈ 7,40**.",
    "Il tampone bicarbonato funziona bene nonostante il pKa 6,1 perché è un **sistema aperto**: i polmoni regolano la CO₂, i reni il bicarbonato.",
    "Altri tamponi biologici: **fosfato** H₂PO₄⁻/HPO₄²⁻ (importante nella cellula e nelle urine) e **proteine** (es. gruppi imidazolici dell’istidina dell’emoglobina).",
  ],
  keyConcepts: [
    "Coppia coniugata acido debole / base debole",
    "Equazione di Henderson-Hasselbalch",
    "pH = pKa quando le concentrazioni sono uguali",
    "Intervallo pKa ± 1 e capacità tamponante",
    "Tampone CO₂/bicarbonato come sistema aperto",
    "Acidosi e alcalosi respiratorie e metaboliche",
  ],
  definitions: [
    { term: "Soluzione tampone", definition: "Soluzione contenente una coppia acido debole/base coniugata in concentrazioni paragonabili, che si oppone a variazioni di pH per aggiunte moderate di acidi o basi." },
    { term: "pKa", definition: "−log₁₀ Ka: pH al quale la forma acida e quella basica della coppia sono presenti in uguale concentrazione." },
    { term: "Capacità tamponante", definition: "Quantità di acido o base forte che un tampone può neutralizzare per unità di variazione di pH; massima a pH = pKa e proporzionale alla concentrazione totale." },
    { term: "Acidosi / alcalosi", definition: "pH ematico inferiore a 7,35 / superiore a 7,45. Respiratoria se la causa primaria è la pCO₂, metabolica se è il bicarbonato." },
    { term: "Anidrasi carbonica", definition: "Enzima che catalizza CO₂ + H₂O ⇌ H₂CO₃, rendendo rapidissimo l’equilibrio tra CO₂ disciolta e bicarbonato." },
  ],
  schema: {
    title: "Come ragiona un tampone",
    steps: [
      { label: "Coppia", detail: "HA ⇌ H⁺ + A⁻ · acido debole + base coniugata" },
      { label: "Aggiunta di acido", detail: "A⁻ + H₃O⁺ → HA + H₂O · il rapporto A⁻/HA scende di poco" },
      { label: "Aggiunta di base", detail: "HA + OH⁻ → A⁻ + H₂O · il rapporto A⁻/HA sale di poco" },
      { label: "Equazione", detail: "pH = pKa + log([A⁻]/[HA])" },
      { label: "Sangue", detail: "pH = 6,1 + log([HCO₃⁻]/(0,03·pCO₂)) · rapporto 20:1 → 7,40" },
    ],
  },
  sections: [
    {
      id: "richiami",
      title: "Richiami: acidi deboli e Ka",
      body: [
        "Secondo **Brønsted e Lowry** un acido cede un protone e una base lo accetta; ogni acido ha una **base coniugata**. Un acido debole HA è solo parzialmente dissociato in acqua: HA + H₂O ⇌ H₃O⁺ + A⁻, con costante **Ka = [H₃O⁺][A⁻]/[HA]**.",
        "Per una coppia coniugata vale **Ka · Kb = Kw** (1,0·10⁻¹⁴ a 25 °C), cioè pKa + pKb = 14: più l’acido è debole, più la sua base coniugata è forte. Una coppia formata da un acido **forte** (es. HCl) e dalla sua base coniugata (Cl⁻, praticamente priva di basicità) **non** può fare da tampone.",
      ],
    },
    {
      id: "funzionamento",
      title: "Come funziona un tampone",
      body: [
        "Consideriamo acido acetico (CH₃COOH, pKa 4,76) e acetato di sodio. Se aggiungiamo un acido forte, gli H₃O⁺ reagiscono con l’acetato: CH₃COO⁻ + H₃O⁺ → CH₃COOH + H₂O. Se aggiungiamo una base forte, gli OH⁻ reagiscono con l’acido acetico: CH₃COOH + OH⁻ → CH₃COO⁻ + H₂O.",
        "In entrambi i casi la specie forte aggiunta viene **convertita in una specie debole**: cambia solo il **rapporto** [A⁻]/[HA], e il pH dipende dal logaritmo di quel rapporto, quindi varia poco. Un tampone non mantiene il pH «costante»: ne **limita** le variazioni, e solo finché entrambe le forme della coppia sono presenti in quantità sufficiente.",
      ],
    },
    {
      id: "hh",
      title: "L’equazione di Henderson-Hasselbalch",
      body: [
        "Partendo da Ka = [H₃O⁺][A⁻]/[HA] e passando ai logaritmi cambiati di segno si ottiene **pH = pKa + log([A⁻]/[HA])**. L’equazione è stata formulata da Lawrence J. Henderson (1908) e riscritta in forma logaritmica da Karl A. Hasselbalch (1917).",
        "Conseguenze immediate: se [A⁻] = [HA] allora **pH = pKa**; se il rapporto è 10, pH = pKa + 1; se è 0,1, pH = pKa − 1. L’equazione è un’approssimazione: funziona bene quando le concentrazioni non sono troppo diluite e il rapporto resta entro circa 0,1–10.",
      ],
    },
    {
      id: "efficienza",
      title: "Intervallo ed efficienza di un tampone",
      body: [
        "Un tampone è efficace nell’intervallo **pKa ± 1**. Per scegliere il tampone giusto si parte quindi da una coppia con pKa vicino al pH desiderato (es. acetato per pH ≈ 4,8; fosfato per pH ≈ 7; ammonio/ammoniaca, pKa 9,25, per pH ≈ 9).",
        "La **capacità tamponante** è massima quando le due forme sono in rapporto 1:1 e cresce con la **concentrazione totale**: un tampone 0,5 M resiste a un’aggiunta di acido molto più di uno 0,01 M allo stesso pH. Diluire un tampone non ne cambia (idealmente) il pH, perché il rapporto resta lo stesso, ma ne riduce la capacità.",
      ],
    },
    {
      id: "sangue",
      title: "I tamponi del sangue",
      body: [
        "Nel plasma la CO₂ si idrata ad acido carbonico (reazione accelerata dall’**anidrasi carbonica**), che si dissocia in H⁺ e **bicarbonato**: CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻. Il pKa apparente della coppia CO₂/HCO₃⁻ a 37 °C è **6,1**.",
        "Si usa la pCO₂ al posto della concentrazione di acido carbonico: [CO₂ disciolta] = 0,03 mmol·L⁻¹·mmHg⁻¹ × pCO₂. Quindi **pH = 6,1 + log([HCO₃⁻] / (0,03 · pCO₂))**. Con valori normali (24 mM; 40 mmHg) il denominatore è 1,2 mM, il rapporto è 20 e log 20 ≈ 1,3: **pH ≈ 7,40**.",
        "Un pKa di 6,1 è lontano da 7,4: in un sistema chiuso questo tampone sarebbe poco efficiente. Funziona perché è **aperto**: i **polmoni** eliminano o trattengono CO₂ in pochi minuti, i **reni** modulano il bicarbonato in ore o giorni.",
        "Contribuiscono anche il **tampone fosfato** (H₂PO₄⁻/HPO₄²⁻, pKa ≈ 6,8 in condizioni fisiologiche), rilevante soprattutto nel liquido intracellulare e nelle urine, e le **proteine**, in particolare l’emoglobina grazie ai residui di istidina.",
      ],
      callout: { tone: "clinical", text: "Acidosi respiratoria: aumento della pCO₂ (es. ipoventilazione). Acidosi metabolica: riduzione del bicarbonato (es. chetoacidosi diabetica). L’organismo compensa agendo sull’altro termine del rapporto: nell’acidosi metabolica, per esempio, l’iperventilazione abbassa la pCO₂." },
    },
  ],
  objectives: [
    "Definire una soluzione tampone e riconoscere le coppie in grado di formarla.",
    "Ricavare e applicare l’equazione di Henderson-Hasselbalch.",
    "Valutare intervallo utile ed efficienza di un sistema tampone.",
    "Descrivere i tamponi del sangue: CO₂/bicarbonato, fosfato, proteine.",
    "Interpretare acidosi e alcalosi in termini di rapporto bicarbonato/CO₂.",
  ],
  examples: [
    {
      title: "Tampone acetato contro acqua pura",
      body: "1 L di tampone 0,10 M CH₃COOH / 0,10 M CH₃COONa ha pH 4,76. Aggiungendo 0,010 mol di HCl: HA = 0,11 mol, A⁻ = 0,09 mol → pH = 4,76 + log(0,09/0,11) ≈ 4,67. La stessa quantità di HCl in 1 L di acqua pura porta il pH da 7 a 2.",
    },
    {
      title: "Ipoventilazione acuta",
      body: "Se la pCO₂ sale a 60 mmHg con bicarbonato ancora a 24 mM: 0,03 × 60 = 1,8 mM; rapporto 24/1,8 ≈ 13,3; log ≈ 1,12 → pH ≈ 7,22. È un’acidosi respiratoria acuta, non ancora compensata dai reni.",
    },
  ],
  conceptMap: {
    nodes: [
      { id: "ha", label: "Acido debole HA", group: 0 },
      { id: "a", label: "Base coniugata A⁻", group: 0 },
      { id: "hh", label: "pH = pKa + log(A⁻/HA)", group: 1 },
      { id: "range", label: "pKa ± 1", group: 1 },
      { id: "cap", label: "Capacità tamponante", group: 1 },
      { id: "bic", label: "CO₂ / HCO₃⁻ (pKa 6,1)", group: 2 },
      { id: "lung", label: "Polmoni: pCO₂", group: 2 },
      { id: "kid", label: "Reni: HCO₃⁻", group: 2 },
      { id: "dis", label: "Acidosi / alcalosi", group: 3 },
    ],
    edges: [
      { from: "ha", to: "a", label: "coppia coniugata" },
      { from: "a", to: "hh", label: "rapporto" },
      { from: "hh", to: "range", label: "efficace in" },
      { from: "hh", to: "cap", label: "massima a pH = pKa" },
      { from: "bic", to: "hh", label: "caso del plasma" },
      { from: "lung", to: "bic", label: "regolano" },
      { from: "kid", to: "bic", label: "regolano" },
      { from: "bic", to: "dis", label: "squilibri" },
    ],
  },
  activeRecall: [
    { prompt: "Scrivi l’equazione di Henderson-Hasselbalch.", answer: "pH = pKa + log([A⁻]/[HA])." },
    { prompt: "Qual è il pH di un tampone con [A⁻] = [HA]?", answer: "pH = pKa." },
    { prompt: "Perché HCl/NaCl non è un tampone?", answer: "Cl⁻ è una base coniugata trascurabile: non può neutralizzare gli H⁺ aggiunti. Serve un acido debole con la sua base coniugata." },
    { prompt: "Valori normali di pH, bicarbonato e pCO₂ arteriosi.", answer: "pH 7,35–7,45; HCO₃⁻ ≈ 24 mM (22–26); pCO₂ ≈ 40 mmHg (35–45)." },
    { prompt: "Perché il tampone bicarbonato è efficace pur con pKa 6,1?", answer: "È un sistema aperto: i polmoni regolano la CO₂ e i reni il bicarbonato." },
  ],
  elaborative: [
    { question: "Perché la capacità tamponante è massima a pH = pKa?", answer: "Perché le due forme sono presenti in quantità uguali: il tampone può neutralizzare sia acido sia base nella misura massima, e una data aggiunta modifica il meno possibile il logaritmo del rapporto." },
    { question: "Perché diluire un tampone non ne cambia il pH ma lo rende meno efficace?", answer: "Il pH dipende dal rapporto [A⁻]/[HA], che la diluizione non modifica; la capacità dipende invece dalle quantità assolute delle due specie, che per unità di volume diminuiscono." },
    { question: "Perché l’iperventilazione compensa un’acidosi metabolica?", answer: "Abbassando la pCO₂ riduce il denominatore del rapporto HCO₃⁻/(0,03·pCO₂), che si riavvicina a 20 nonostante il bicarbonato ridotto: il pH risale verso la norma." },
  ],
  selfExplanation: [
    { step: "Ka = [H₃O⁺][A⁻]/[HA]", prompt: "Cosa ottieni isolando [H₃O⁺]?", modelAnswer: "[H₃O⁺] = Ka · [HA]/[A⁻]." },
    { step: "−log[H₃O⁺] = −log Ka − log([HA]/[A⁻])", prompt: "Come riscrivi ciascun termine?", modelAnswer: "pH = pKa + log([A⁻]/[HA]), perché −log([HA]/[A⁻]) = +log([A⁻]/[HA])." },
    { step: "Aggiungo 0,01 mol di H⁺ a 0,1 mol A⁻ + 0,1 mol HA.", prompt: "Perché aggiorno le moli e non le concentrazioni iniziali?", modelAnswer: "La neutralizzazione è stechiometrica e completa: 0,01 mol di A⁻ diventano HA. Nello stesso volume il rapporto di moli coincide con il rapporto di concentrazioni." },
  ],
  guidedProblems: [
    {
      id: "tamp-p1",
      statement: "Quale rapporto [HPO₄²⁻]/[H₂PO₄⁻] serve per ottenere un tampone fosfato a pH 7,4, assumendo pKa = 6,8?",
      steps: [
        { hint: "Scrivi Henderson-Hasselbalch e isola il logaritmo.", result: "log(rapporto) = 7,4 − 6,8 = 0,6" },
        { hint: "Calcola 10⁰·⁶.", result: "≈ 3,98" },
      ],
      answer: "Rapporto ≈ 4:1 a favore della forma basica HPO₄²⁻.",
    },
    {
      id: "tamp-p2",
      statement: "Un paziente ha pH 7,25, pCO₂ 30 mmHg. Calcola il bicarbonato e classifica il disturbo (pKa 6,1).",
      steps: [
        { hint: "log([HCO₃⁻]/(0,03·pCO₂)) = pH − 6,1", result: "= 1,15 → rapporto ≈ 14,1" },
        { hint: "0,03 × 30 = ?", result: "0,9 mM" },
        { hint: "Moltiplica.", result: "[HCO₃⁻] ≈ 12,7 mM" },
        { hint: "Il pH è acido: la causa primaria è la CO₂ o il bicarbonato?", result: "Bicarbonato basso; la pCO₂ bassa è la compensazione respiratoria." },
      ],
      answer: "HCO₃⁻ ≈ 13 mM: acidosi metabolica con compensazione respiratoria (iperventilazione).",
    },
  ],
  feynman: {
    essentials: [
      { concept: "Acido debole + base coniugata", keywords: [["debole"], ["coniugat", "sale", "base"]], explanation: "Un tampone è formato da un acido debole e dalla sua base coniugata (o viceversa)." },
      { concept: "Neutralizzazione di H⁺ e OH⁻ aggiunti", keywords: [["neutralizz", "reagisce", "assorbe", "cattura", "consuma"]], explanation: "La base coniugata reagisce con gli H⁺ aggiunti, l’acido debole con gli OH⁻." },
      { concept: "Henderson-Hasselbalch", keywords: [["henderson", "pka + log", "pka+log", "logaritmo del rapporto", "log del rapporto"]], explanation: "pH = pKa + log([A⁻]/[HA])." },
      { concept: "pH = pKa con concentrazioni uguali / intervallo ±1", keywords: [["pka"], ["uguale", "uguali", "piu o meno 1", "± 1", "+/- 1", "intervallo"]], explanation: "Il tampone lavora meglio vicino al pKa, entro circa ±1 unità." },
      { concept: "Capacità dipendente dalla concentrazione", keywords: [["capacit", "efficien", "concentrat"]], explanation: "Più è concentrato, più acido o base può neutralizzare." },
      { concept: "Esempio biologico: bicarbonato regolato da polmoni e reni", keywords: [["bicarbonato", "hco3", "co2"]], explanation: "Nel sangue il sistema CO₂/HCO₃⁻ è regolato da polmoni (CO₂) e reni (HCO₃⁻)." },
    ],
    misconceptions: [
      { id: "costante", triggers: [["mantiene", "tiene"], ["costante", "invariato", "fisso"]], excludes: ["quasi", "circa", "limita", "poco", "non"], correction: "Un tampone non mantiene il pH costante: ne limita le variazioni, entro la sua capacità." },
      { id: "acido-forte", triggers: [["acido forte"], ["tampone"]], excludes: ["non", "aggiun", "debole"], correction: "Un acido forte con la sua base coniugata non forma un tampone: serve un acido (o una base) debole." },
      { id: "pka-74", triggers: [["bicarbonato"], ["pka"], ["7,4", "7.4", "vicino"]], excludes: ["6,1", "6.1", "lontano", "non"], correction: "Il pKa della coppia CO₂/HCO₃⁻ è 6,1, lontano da 7,4: il tampone funziona perché il sistema è aperto, non per la vicinanza del pKa." },
      { id: "diluizione", triggers: [["diluiz", "diluisc"], ["cambia il ph", "varia il ph", "pH cambia"]], excludes: ["non", "capacit"], correction: "Diluire un tampone lascia (idealmente) invariato il pH perché il rapporto non cambia; diminuisce invece la capacità tamponante." },
    ],
  },
  palaceSuggestions: [
    { concept: "Acido debole + base coniugata", image: "Una coppia di ballerini (HA e A⁻) che si passa un pallone rosso (H⁺) all’ingresso." },
    { concept: "pH = pKa + log(A⁻/HA)", image: "Una bilancia a due piatti in cucina: quando i piatti sono pari, l’ago segna il pKa." },
    { concept: "Capacità ∝ concentrazione", image: "Una diga: più è alta, più acqua (acido) trattiene." },
    { concept: "CO₂/bicarbonato aperto", image: "Una finestra spalancata (polmoni) e uno scarico in bagno (reni) che regolano il livello di una vasca." },
  ],
  advanced: [
    {
      title: "La capacità tamponante in forma quantitativa",
      body: [
        "La capacità tamponante β = dC_base/dpH vale, per una coppia monoprotica, β ≈ 2,303 · C · Ka[H₃O⁺]/(Ka + [H₃O⁺])², dove C è la concentrazione totale. La funzione ha un massimo per [H₃O⁺] = Ka, cioè pH = pKa, dove β = 0,576 · C: ecco la ragione quantitativa delle regole pratiche.",
      ],
    },
    {
      title: "Diagramma di Davenport e gap anionico",
      body: [
        "In clinica l’equilibrio acido-base si interpreta con nomogrammi pH/HCO₃⁻/pCO₂ e con indici come il gap anionico (Na⁺ − (Cl⁻ + HCO₃⁻)), utile a distinguere le acidosi metaboliche. Sono strumenti dei corsi di fisiologia e medicina interna, non richiesti dal syllabus del semestre filtro.",
      ],
    },
  ],
  sources: [
    { label: "MUR — Syllabus semestre filtro 2026/27, Chimica e propedeutica biochimica, Unità 4", url: "https://www.mur.gov.it/it/news/venerdi-19062026/semestre-aperto-aa-2026-2027", kind: "ufficiale" },
    { label: "OpenStax, Chemistry 2e — 14.6 Buffers", url: "https://openstax.org/books/chemistry-2e/pages/14-6-buffers", kind: "manuale" },
    { label: "Henderson L.J. (1908). Concerning the relationship between the strength of acids and their capacity to preserve neutrality. Am J Physiol 21:173–179", doi: "10.1152/ajplegacy.1908.21.2.173", kind: "articolo" },
    { label: "Berg J.M., Tymoczko J.L., Stryer L., Biochemistry, 5ª ed. (NCBI Bookshelf)", url: "https://www.ncbi.nlm.nih.gov/books/NBK21154/", kind: "manuale" },
  ],
  videoIds: ["yt-HzmI7A578ss", "yt-7ZLjzp7thNI", "yt-pAuRZr0AHhI", "yt-XR_0k8JIawY", "yt-8Fdt5WnYn1k", "yt-jdmHjFp_35I", "yt-ANi709MYnWg"],
  flashcards: [
    { id: "tamp-f1", front: "Definizione di soluzione tampone", back: "Acido debole + base coniugata (o base debole + acido coniugato) in quantità paragonabili: limita le variazioni di pH." },
    { id: "tamp-f2", front: "Equazione di Henderson-Hasselbalch", back: "pH = pKa + log([A⁻]/[HA])." },
    { id: "tamp-f3", front: "Intervallo utile di un tampone", back: "pKa ± 1 (rapporto tra 0,1 e 10)." },
    { id: "tamp-f4", front: "Da cosa dipende la capacità tamponante?", back: "Dalla concentrazione totale ed è massima a pH = pKa." },
    { id: "tamp-f5", front: "pKa apparente CO₂/HCO₃⁻ a 37 °C", back: "6,1." },
    { id: "tamp-f6", front: "Henderson-Hasselbalch per il plasma", back: "pH = 6,1 + log([HCO₃⁻]/(0,03 · pCO₂)), pCO₂ in mmHg." },
    { id: "tamp-f7", front: "Rapporto HCO₃⁻/CO₂ disciolta a pH 7,40", back: "20:1 (24 mM / 1,2 mM)." },
    { id: "tamp-f8", front: "Acidosi respiratoria vs metabolica", back: "Respiratoria: ↑ pCO₂ primaria. Metabolica: ↓ HCO₃⁻ primaria." },
    { id: "tamp-f9", front: "Tamponi non bicarbonato del sangue", back: "Fosfato (H₂PO₄⁻/HPO₄²⁻) e proteine, soprattutto emoglobina (istidina)." },
    { id: "tamp-f10", front: "Relazione tra Ka e Kb di una coppia coniugata", back: "Ka · Kb = Kw → pKa + pKb = 14 (25 °C)." },
  ],
};
