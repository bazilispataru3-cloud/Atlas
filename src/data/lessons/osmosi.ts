import type { Lesson } from "@/lib/types";

export const osmosi: Lesson = {
  topicId: "chim-osmosi",
  readingMinutes: 26,
  diagram: "osmosis",
  intro: [
    "Una flebo di acqua distillata in vena sarebbe pericolosa: i globuli rossi si gonfierebbero fino a rompersi. Una soluzione fisiologica allo 0,9% invece è sicura. La differenza sta tutta in una proprietà che non dipende dalla natura dei soluti ma dal **numero di particelle**: la **pressione osmotica**.",
    "In questa lezione distingui **osmosi** e **diffusione**, calcoli **osmolarità** e **pressione osmotica** con il fattore di **van’t Hoff**, separi il concetto di **osmolarità** da quello di **tonicità** e lo applichi a emolisi, edema e soluzioni per infusione.",
  ],
  fastSummary: [
    "**Osmosi**: passaggio netto di **solvente** (acqua) attraverso una membrana semipermeabile, dalla soluzione **meno concentrata** in soluti verso quella **più concentrata**.",
    "**Pressione osmotica** (van’t Hoff): **π = i · M · R · T**. È la pressione da applicare alla soluzione più concentrata per impedire il flusso osmotico.",
    "**Fattore di van’t Hoff i**: numero di particelle per unità di formula (glucosio 1; NaCl ≈ 2; CaCl₂ ≈ 3). Nelle soluzioni reali è un po’ inferiore al valore ideale.",
    "**Osmolarità** = Σ i·M (osmol/L); **osmolalità** = osmol/kg di solvente. Plasma ≈ **285–295 mOsm/kg**.",
    "**Fisiologica** (NaCl 0,9%): 0,154 M → ≈ 308 mOsm/L teorici, ≈ 286 effettivi: **isotonica**. **Glucosata 5%**: ≈ 278 mOsm/L, iso-osmotica, ma diventa di fatto **ipotonica** quando il glucosio viene metabolizzato.",
    "**Tonicità** ≠ osmolarità: conta solo per i soluti che **non attraversano** la membrana. Una soluzione di urea iso-osmotica è ipotonica per i globuli rossi.",
    "Globulo rosso: in soluzione **ipotonica** si gonfia fino all’**emolisi**; in **ipertonica** perde acqua e si raggrinzisce (**crenatura**).",
    "**Edema**: squilibrio tra pressione idrostatica capillare e **pressione oncotica** delle proteine plasmatiche (es. ipoalbuminemia).",
  ],
  keyConcepts: [
    "Proprietà colligative: dipendono dal numero di particelle",
    "Pressione osmotica π = i·M·R·T",
    "Fattore di van’t Hoff",
    "Osmolarità vs osmolalità",
    "Tonicità e soluti penetranti/non penetranti",
    "Soluzioni isotoniche, ipotoniche, ipertoniche",
    "Emolisi ed edema",
  ],
  definitions: [
    { term: "Membrana semipermeabile", definition: "Membrana permeabile al solvente ma non (o poco) ad alcuni soluti." },
    { term: "Osmolarità", definition: "Numero di osmoli (moli di particelle osmoticamente attive) per litro di soluzione." },
    { term: "Osmolalità", definition: "Numero di osmoli per chilogrammo di solvente; non dipende dalla temperatura ed è il parametro misurato in laboratorio." },
    { term: "Fattore di van’t Hoff (i)", definition: "Rapporto tra il numero di particelle in soluzione e il numero di unità di formula sciolte." },
    { term: "Tonicità", definition: "Effetto di una soluzione sul volume di una cellula; dipende dalla concentrazione dei soli soluti che non attraversano la membrana." },
    { term: "Pressione oncotica", definition: "Componente della pressione osmotica del plasma dovuta alle proteine (soprattutto albumina), che non attraversano facilmente la parete capillare." },
  ],
  schema: {
    title: "Dalla formula al globulo rosso",
    steps: [
      { label: "Conta le particelle", detail: "i × M per ogni soluto → osmolarità" },
      { label: "Pressione osmotica", detail: "π = i·M·R·T (R = 0,0821 L·atm·mol⁻¹·K⁻¹)" },
      { label: "Confronta con la cellula", detail: "≈ 290 mOsm: iso / ipo / iper" },
      { label: "Considera la permeabilità", detail: "Soluti penetranti (urea) non contano per la tonicità" },
      { label: "Prevedi l’effetto", detail: "Ipotonica → rigonfiamento, emolisi · Ipertonica → crenatura" },
    ],
  },
  sections: [
    {
      id: "colligative",
      title: "Una proprietà colligativa",
      body: [
        "Le **proprietà colligative** (abbassamento della tensione di vapore, innalzamento ebullioscopico, abbassamento crioscopico, pressione osmotica) dipendono dal **numero di particelle** di soluto disciolte e non dalla loro identità.",
        "Per questo nei calcoli conta il **fattore di van’t Hoff**: una mole di glucosio dà una mole di particelle, una mole di NaCl ne dà circa due (Na⁺ e Cl⁻), una mole di CaCl₂ circa tre.",
      ],
    },
    {
      id: "osmosi",
      title: "Diffusione e osmosi",
      body: [
        "La **diffusione** è il movimento netto di particelle da una regione a concentrazione maggiore verso una a concentrazione minore, guidato dall’agitazione termica e dall’aumento di entropia.",
        "Se una membrana lascia passare l’acqua ma non il soluto, è l’**acqua** a muoversi: dal compartimento in cui la concentrazione di soluti è **minore** (e quella dell’acqua maggiore) verso quello in cui è **maggiore**. Questo flusso netto di solvente è l’**osmosi**. Nelle cellule l’acqua attraversa la membrana sia per diffusione attraverso il doppio strato sia, più rapidamente, attraverso canali specifici, le **acquaporine**.",
      ],
    },
    {
      id: "pressione",
      title: "La pressione osmotica e l’equazione di van’t Hoff",
      body: [
        "La **pressione osmotica** π è la pressione che bisogna applicare alla soluzione più concentrata per impedire il passaggio netto di solvente. Per soluzioni diluite vale l’equazione di **van’t Hoff**: **π = i · M · R · T**, con M in mol/L, R = 0,0821 L·atm·mol⁻¹·K⁻¹ e T in kelvin.",
        "Sono pressioni sorprendentemente grandi: una soluzione 0,30 osmol/L a 37 °C (310 K) ha π = 0,30 × 0,0821 × 310 ≈ **7,6 atm**. Basta quindi una piccola differenza di osmolarità tra due compartimenti per generare un flusso d’acqua importante.",
      ],
    },
    {
      id: "osmolarita",
      title: "Osmolarità e osmolalità dei liquidi corporei",
      body: [
        "L’**osmolarità** si calcola sommando i contributi di tutti i soluti: Σ iₖ·Mₖ. L’**osmolalità** si riferisce invece al kg di solvente; nei liquidi biologici diluiti i due valori sono molto vicini.",
        "L’osmolalità del plasma è circa **285–295 mOsm/kg** ed è uguale a quella del liquido intracellulare: all’equilibrio l’acqua si distribuisce finché le osmolalità dei compartimenti si eguagliano. Una stima clinica rapida è **2·[Na⁺] + [glucosio] + [urea]** (in mmol/L): con 140, 5 e 5 mmol/L si ottengono 290 mOsm/kg.",
        "Le soluzioni reali di elettroliti si comportano in modo non ideale: le interazioni tra ioni riducono il numero «effettivo» di particelle. Per la fisiologica il coefficiente osmotico è circa 0,93, perciò l’osmolarità effettiva (≈ 286) è inferiore a quella teorica (308).",
      ],
    },
    {
      id: "tonicita",
      title: "Tonicità: ciò che vede la cellula",
      body: [
        "Una soluzione è **isotonica** se non modifica il volume cellulare, **ipotonica** se lo fa aumentare, **ipertonica** se lo fa diminuire. La tonicità dipende solo dai soluti che **non attraversano** la membrana (soluti «efficaci»).",
        "Esempio chiave: una soluzione di **urea** 290 mM è iso-osmotica con il plasma ma **ipotonica** per il globulo rosso. L’urea entra nella cellula, l’acqua la segue e la cellula si gonfia fino a lisarsi.",
        "La **glucosata al 5%** (≈ 278 mOsm/L) è iso-osmotica e può essere infusa in vena senza emolisi; ma una volta che il glucosio viene captato e metabolizzato dalle cellule, ciò che resta è acqua libera: dal punto di vista fisiologico agisce come una soluzione **ipotonica**.",
      ],
      callout: { tone: "clinical", text: "Infondere una soluzione ipotonica può causare emolisi e, a livello cerebrale, edema; per questo le soluzioni per infusione endovenosa sono formulate isotoniche (fisiologica, Ringer lattato, glucosata 5%)." },
    },
    {
      id: "fisiopatologia",
      title: "Emolisi ed edema",
      body: [
        "In soluzione ipotonica il globulo rosso, che non ha una parete rigida, si rigonfia fino alla rottura della membrana: **emolisi**, con liberazione di emoglobina. In soluzione ipertonica perde acqua e assume una forma raggrinzita, irta di spicule (**crenatura**).",
        "Negli scambi capillari contano le **forze di Starling**: la pressione idrostatica spinge liquido fuori dal capillare, la **pressione oncotica** delle proteine plasmatiche (circa 25 mmHg) lo richiama. Se l’albumina diminuisce (malnutrizione, cirrosi, sindrome nefrosica) la pressione oncotica cala e il liquido si accumula nell’interstizio: **edema**.",
      ],
    },
  ],
  objectives: [
    "Distinguere diffusione e osmosi.",
    "Calcolare osmolarità e pressione osmotica di soluzioni di elettroliti e non elettroliti con il fattore di van’t Hoff.",
    "Distinguere osmolarità, osmolalità e tonicità.",
    "Classificare soluzioni isotoniche, ipotoniche e ipertoniche e prevederne l’effetto sulle cellule.",
    "Interpretare emolisi ed edema come conseguenze di squilibri osmotici.",
  ],
  examples: [
    {
      title: "Perché proprio 0,9%?",
      body: "9 g/L di NaCl (58,44 g/mol) corrispondono a 0,154 mol/L. Con i ≈ 2 si ottengono ≈ 308 mOsm/L teorici; tenendo conto del comportamento non ideale l’osmolarità effettiva è ≈ 286 mOsm/L, vicina a quella del plasma.",
    },
    {
      title: "Il plasma congela sotto zero",
      body: "Con un’osmolalità di circa 0,29 osmol/kg e una costante crioscopica dell’acqua di 1,86 °C·kg/mol, il plasma congela a circa −0,54 °C. Gli osmometri clinici misurano proprio l’abbassamento crioscopico per ricavare l’osmolalità.",
    },
  ],
  conceptMap: {
    nodes: [
      { id: "part", label: "N° di particelle (i·M)", group: 0 },
      { id: "osm", label: "Osmolarità", group: 0 },
      { id: "pi", label: "π = i·M·R·T", group: 1 },
      { id: "acqua", label: "Flusso d’acqua", group: 1 },
      { id: "perm", label: "Permeabilità ai soluti", group: 2 },
      { id: "ton", label: "Tonicità", group: 2 },
      { id: "emo", label: "Emolisi / crenatura", group: 3 },
      { id: "ede", label: "Edema (oncotica)", group: 3 },
    ],
    edges: [
      { from: "part", to: "osm", label: "somma" },
      { from: "osm", to: "pi", label: "determina" },
      { from: "pi", to: "acqua", label: "genera" },
      { from: "perm", to: "ton", label: "solo soluti efficaci" },
      { from: "osm", to: "ton", label: "≠" },
      { from: "ton", to: "emo", label: "sui globuli rossi" },
      { from: "pi", to: "ede", label: "nei capillari" },
    ],
  },
  activeRecall: [
    { prompt: "In quale direzione si muove l’acqua nell’osmosi?", answer: "Dalla soluzione con minore concentrazione di soluti verso quella con concentrazione maggiore." },
    { prompt: "Scrivi l’equazione di van’t Hoff e le unità.", answer: "π = i·M·R·T; M in mol/L, R = 0,0821 L·atm/(mol·K), T in K → π in atm." },
    { prompt: "Osmolarità della fisiologica 0,9%, teorica ed effettiva.", answer: "≈ 308 mOsm/L teorica; ≈ 286 mOsm/L effettiva." },
    { prompt: "Differenza tra osmolarità e tonicità?", answer: "L’osmolarità conta tutte le particelle; la tonicità solo quelle che non attraversano la membrana e quindi determinano lo spostamento d’acqua." },
    { prompt: "Cosa succede a un globulo rosso in soluzione ipotonica?", answer: "Assorbe acqua, si gonfia e può andare incontro a emolisi." },
  ],
  elaborative: [
    { question: "Perché una soluzione di urea iso-osmotica fa scoppiare i globuli rossi?", answer: "L’urea attraversa la membrana: si equilibra dentro e fuori, quindi non contribuisce a trattenere l’acqua all’esterno. L’osmolalità interna dovuta ai soluti intrappolati richiama acqua e la cellula si gonfia." },
    { question: "Perché l’albumina, pur avendo una concentrazione molare bassa, è decisiva negli scambi capillari?", answer: "Le piccole molecole attraversano liberamente la parete capillare e non creano gradienti efficaci; le proteine no. La pressione oncotica è quindi la principale forza osmotica efficace tra plasma e interstizio." },
  ],
  selfExplanation: [
    { step: "CaCl₂ 0,10 M → i = 3 → 0,30 osmol/L.", prompt: "Perché i = 3?", modelAnswer: "Ogni unità di formula si dissocia in un Ca²⁺ e due Cl⁻: tre particelle." },
    { step: "π = 0,30 × 0,0821 × 310 = 7,6 atm.", prompt: "Perché T = 310 K?", modelAnswer: "37 °C + 273 = 310 K: nell’equazione serve la temperatura assoluta." },
    { step: "Plasma ≈ 0,29 osmol/L.", prompt: "La soluzione è iso-, ipo- o ipertonica per un globulo rosso?", modelAnswer: "Leggermente ipertonica (≈ 300 vs 290 mOsm), assumendo che Ca²⁺ e Cl⁻ non entrino nella cellula: i globuli rossi perderebbero un po’ d’acqua." },
  ],
  guidedProblems: [
    {
      id: "osm-p1",
      statement: "Calcola la pressione osmotica di una soluzione di glucosio 0,10 M a 37 °C.",
      steps: [
        { hint: "Il glucosio si dissocia?", result: "No: i = 1" },
        { hint: "Applica π = i·M·R·T.", result: "1 × 0,10 × 0,0821 × 310" },
      ],
      answer: "π ≈ 2,5 atm.",
    },
    {
      id: "osm-p2",
      statement: "Ordina per osmolarità crescente: saccarosio 0,30 M; NaCl 0,10 M; CaCl₂ 0,12 M; urea 0,25 M. Quale è (circa) isotonica per un globulo rosso?",
      steps: [
        { hint: "Calcola i·M per ciascuna.", result: "Saccarosio 0,30; NaCl 0,20; CaCl₂ 0,36; urea 0,25 osmol/L" },
        { hint: "Ordina.", result: "NaCl < urea < saccarosio < CaCl₂" },
        { hint: "Ricorda: tonicità solo per soluti non penetranti; plasma ≈ 0,29.", result: "Il saccarosio non entra nel globulo rosso: 0,30 M ≈ isotonica. L’urea entra: è ipotonica nonostante 0,25 osmol/L" },
      ],
      answer: "NaCl (0,20) < urea (0,25) < saccarosio (0,30) < CaCl₂ (0,36). Approssimativamente isotonica: saccarosio 0,30 M.",
    },
  ],
  feynman: {
    essentials: [
      { concept: "Si muove il solvente (acqua)", keywords: [["acqua", "solvente"]], explanation: "Nell’osmosi si sposta il solvente, non il soluto." },
      { concept: "Membrana semipermeabile", keywords: [["semipermeabil", "membrana"]], explanation: "Serve una membrana che lasci passare l’acqua ma non il soluto." },
      { concept: "Direzione: verso la soluzione più concentrata", keywords: [["piu concentrat", "maggiore concentrazione", "verso il soluto", "ipertonic"]], explanation: "L’acqua va dalla soluzione meno concentrata in soluti a quella più concentrata." },
      { concept: "Dipende dal numero di particelle (van’t Hoff)", keywords: [["particelle", "van", "osmolarit", "colligativ"]], explanation: "La pressione osmotica dipende dal numero di particelle: π = i·M·R·T." },
      { concept: "Effetto sulle cellule (iso/ipo/iper)", keywords: [["isotonic", "ipotonic", "ipertonic", "emolisi", "globul"]], explanation: "La tonicità determina se la cellula si gonfia, resta stabile o si raggrinzisce." },
    ],
    misconceptions: [
      { id: "verso-diluita", triggers: [["acqua"], ["meno concentrat", "piu diluit", "verso la soluzione diluita"]], excludes: ["da", "dalla", "non"], correction: "L’acqua si muove dalla soluzione meno concentrata verso quella più concentrata in soluti, non il contrario." },
      { id: "soluto-osmosi", triggers: [["soluto", "sale", "glucosio"], ["passa", "attraversa", "si sposta"], ["osmosi"]], excludes: ["non", "diffusione"], correction: "Nell’osmosi si sposta il solvente; il movimento del soluto secondo gradiente è diffusione." },
      { id: "osm-ton", triggers: [["osmolarit"], ["stessa cosa", "uguale", "sinonim"], ["tonicit"]], excludes: ["non", "diversa"], correction: "Osmolarità e tonicità non coincidono: la tonicità considera solo i soluti che non attraversano la membrana (es. l’urea è osmoticamente attiva ma non efficace)." },
      { id: "glucosata-iper", triggers: [["glucosat"], ["ipertonic"]], excludes: ["non", "10%", "20%", "33%"], correction: "La glucosata al 5% è iso-osmotica (≈ 278 mOsm/L); sono ipertoniche le concentrazioni maggiori (10%, 20%...)." },
    ],
  },
  palaceSuggestions: [
    { concept: "π = i·M·R·T", image: "Un pistone gigante sulla porta d’ingresso con incise le lettere i, M, R, T." },
    { concept: "Fattore di van’t Hoff", image: "Un cristallo di sale che in cucina si spacca in due gemelli (Na⁺, Cl⁻)." },
    { concept: "Emolisi", image: "Un palloncino rosso che si gonfia sotto il rubinetto del bagno fino a scoppiare." },
    { concept: "Urea: osmotica ma non efficace", image: "Un fantasma che attraversa i muri della camera: c’è, ma nessun muro lo trattiene." },
  ],
  advanced: [
    {
      title: "Potenziale idrico ed equilibrio di Donnan",
      body: [
        "In biologia vegetale l’osmosi si descrive con il potenziale idrico (Ψ = Ψ_soluti + Ψ_pressione). Nelle cellule animali, le proteine intracellulari cariche non diffusibili generano l’equilibrio di Gibbs-Donnan, che la pompa Na⁺/K⁺-ATPasi contrasta mantenendo il volume cellulare: un collegamento diretto con il trasporto di membrana (Biologia, Unità 5).",
      ],
    },
  ],
  sources: [
    { label: "MUR — Syllabus semestre filtro 2026/27, Chimica e propedeutica biochimica, Unità 2", url: "https://www.mur.gov.it/it/news/venerdi-19062026/semestre-aperto-aa-2026-2027", kind: "ufficiale" },
    { label: "OpenStax, Chemistry 2e — 11.4 Colligative Properties", url: "https://openstax.org/books/chemistry-2e/pages/11-4-colligative-properties", kind: "manuale" },
    { label: "OpenStax, Anatomy and Physiology 2e — 3.1 The Cell Membrane", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/3-1-the-cell-membrane", kind: "manuale" },
    { label: "Premio Nobel per la Chimica 2003 — Peter Agre (acquaporine) e Roderick MacKinnon", url: "https://www.nobelprize.org/prizes/chemistry/2003/summary/", kind: "risorsa-aperta" },
  ],
  videoIds: ["yt-L-osEc07vMs", "yt-afWnU10ZNfg", "yt-VsW6NXZIUCQ", "yt-aubZU0iWtgI"],
  flashcards: [
    { id: "osm-f1", front: "Definizione di osmosi", back: "Flusso netto di solvente attraverso una membrana semipermeabile verso la soluzione più concentrata in soluti." },
    { id: "osm-f2", front: "Equazione di van’t Hoff", back: "π = i·M·R·T." },
    { id: "osm-f3", front: "Fattore i di glucosio, NaCl, CaCl₂ (ideale)", back: "1; 2; 3." },
    { id: "osm-f4", front: "Osmolalità plasmatica normale", back: "≈ 285–295 mOsm/kg." },
    { id: "osm-f5", front: "Formula di stima dell’osmolalità plasmatica", back: "2·[Na⁺] + [glucosio] + [urea] (mmol/L)." },
    { id: "osm-f6", front: "Molarità e osmolarità della fisiologica 0,9%", back: "0,154 M; ≈ 308 mOsm/L teorici, ≈ 286 effettivi." },
    { id: "osm-f7", front: "Osmolarità della glucosata 5%", back: "≈ 278 mOsm/L: iso-osmotica, fisiologicamente ipotonica dopo il metabolismo del glucosio." },
    { id: "osm-f8", front: "Tonicità", back: "Effetto sul volume cellulare; dipende solo dai soluti che non attraversano la membrana." },
    { id: "osm-f9", front: "Globulo rosso in soluzione ipertonica", back: "Perde acqua e si raggrinzisce (crenatura)." },
    { id: "osm-f10", front: "Pressione oncotica e edema", back: "Pressione osmotica delle proteine plasmatiche (≈ 25 mmHg); se l’albumina cala si forma edema." },
  ],
};
