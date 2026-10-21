import type { Subject } from "@/lib/types";
import { topic } from "./helpers";

// Fonte: MUR, "Syllabus semestre filtro — Insegnamento di Chimica e propedeutica
// biochimica", versione 2026 (notizia MUR del 19/06/2026). Il PDF ufficiale
// presenta difetti di codifica dei caratteri (es. "/" al posto di "ti"): il testo
// è stato ricostruito senza modificarne il contenuto. Capitoli editoriali.

export const chimica: Subject = {
  id: "chimica",
  name: "Chimica e propedeutica biochimica",
  shortName: "Chim",
  cfu: 6,
  tagline: "Le leggi della materia e delle sue trasformazioni, lette attraverso i fenomeni biologici.",
  generalObjective:
    "Fornire le basi per la comprensione delle leggi fondamentali che governano la materia e le sue trasformazioni con particolare attenzione ai fenomeni biologici a livello atomico e molecolare, in relazione alle applicazioni biomediche.",
  units: [
    {
      id: "chim-u1",
      number: 1,
      title: "La struttura dell’atomo, i legami chimici, stati di aggregazione della materia e termodinamica dei sistemi aperti",
      cfu: 1,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "chim-u1-c1",
          title: "Atomo, orbitali e tavola periodica",
          topics: [
            topic(
              "chim-atomo",
              "Struttura dell’atomo e isotopi",
              "La costituzione della materia: Fondamenti della teoria atomica. Struttura dell’atomo: protoni, neutroni e elettroni. Numero atomico e numero di massa. Gli isotopi. Cenni alle proprietà magnetiche del nucleo come base per lo strumento diagnostico della Risonanza Magnetica Nucleare.",
              { keywords: ["atomo", "isotopi", "numero atomico", "RMN"] },
            ),
            topic(
              "chim-orbitali",
              "Numeri quantici, orbitali e configurazione elettronica",
              "I numeri quantici: gli orbitali, il principio di esclusione di Pauli. Regola di Hund. La configurazione elettronica con particolare riferimento agli elementi principalmente presenti negli organismi viventi.",
              { keywords: ["orbitali", "Pauli", "Hund", "configurazione elettronica"] },
            ),
            topic(
              "chim-tavola-periodica",
              "Il sistema periodico e le proprietà periodiche",
              "Il sistema periodico degli elementi: Proprietà periodiche: configurazione elettronica esterna, volume atomico, potenziale di ionizzazione, affinità elettronica, elettronegatività. La regola dell’ottetto.",
              { keywords: ["tavola periodica", "elettronegatività", "ionizzazione"] },
            ),
            topic(
              "chim-mole",
              "Molecole, ioni e la mole",
              "Molecole e ioni: Molecole, ioni e ioni poliatomici. Massa molecolare. Definizione di mole e numero di Avogadro. Unità di massa atomica e massa molecolare.",
              { keywords: ["mole", "Avogadro", "massa molecolare"] },
            ),
          ],
        },
        {
          id: "chim-u1-c2",
          title: "Legame chimico e nomenclatura",
          topics: [
            topic(
              "chim-legame",
              "Il legame chimico, ibridazione e geometria molecolare",
              "Il legame chimico: Orbitale di legame. Legame covalente: omopolare, eteropolare, legame di coordinazione. Cenni sul legame metallico. Il legame ionico. Ibridazione degli orbitali: sp, sp2, sp3. Orbitali molecolari sigma e pi-greco. Distanza e energia di legame. Angolo di legame e geometria molecolare. Esempi di molecole polari e apolari biologicamente rilevanti.",
              { keywords: ["legame covalente", "ibridazione", "geometria molecolare", "legame ionico"] },
            ),
            topic(
              "chim-interazioni-deboli",
              "Interazioni deboli e interazioni idrofobiche",
              "Interazioni deboli: legame idrogeno e forze di van der Waals. Interazioni idrofobiche.",
              { keywords: ["legame idrogeno", "van der Waals", "idrofobico"] },
            ),
            topic(
              "chim-nomenclatura",
              "Numero di ossidazione e nomenclatura inorganica",
              "Numero di ossidazione: Esempi di formule di struttura e nomenclatura di composti binari e ternari biologicamente rilevanti con atomi di carbonio, ossigeno, azoto, zolfo e fosforo (ossidi, idrossidi, perossidi, acidi, basi, e sali).",
            ),
          ],
        },
        {
          id: "chim-u1-c3",
          title: "Stati della materia e termodinamica",
          topics: [
            topic(
              "chim-stato-solido",
              "Lo stato solido",
              "Cenni sullo stato solido: solidi ionici, molecolari, covalenti e metallici.",
            ),
            topic(
              "chim-gas",
              "Lo stato aeriforme e le leggi dei gas",
              "Lo stato aeriforme: Temperatura assoluta. Leggi di Boyle, Charles e Gay Lussac. Applicazione della legge dei gas alla respirazione. Equazione di stato dei gas perfetti. Cenni sulla teoria cinetica dei gas. La legge di Maxwell-Boltzmann.",
              { keywords: ["gas perfetti", "Boyle", "PV=nRT", "teoria cinetica"] },
            ),
            topic(
              "chim-liquidi",
              "Lo stato liquido e i diagrammi di fase",
              "Lo stato liquido: ebollizione, calore di evaporazione. Tensione superficiale. L’equilibrio gas-liquido: la pressione di vapore. Confronto di diagramma di fase di acqua e anidride carbonica. Rilevanza dei cambiamenti di fase di interesse biomedico: l’evaporazione del sudore e la termoregolazione.",
            ),
            topic(
              "chim-termodinamica",
              "Termodinamica e bioenergetica",
              "Principi di termodinamica e bioenergetica: Definizioni delle funzioni di stato. Entalpia. Trasformazioni esotermiche ed endotermiche (cambiamenti di stato). Entropia. Energia libera di Gibbs. Trasformazioni esoergoniche ed endoergoniche. Variazione di energia libera come criterio di spontaneità ed equilibrio nei sistemi aperti.",
              { keywords: ["entalpia", "entropia", "Gibbs", "esoergonica"] },
            ),
          ],
        },
      ],
    },
    {
      id: "chim-u2",
      number: 2,
      title: "Miscele, soluzioni e le proprietà colligative delle soluzioni",
      cfu: 1,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "chim-u2-c1",
          title: "Miscele e concentrazioni",
          topics: [
            topic(
              "chim-miscele",
              "Miscele, soluzioni e solubilità",
              "Miscele e soluzioni: Miscele omogenee ed eterogenee di interesse biologico: soluzioni, sospensioni, colloidi e aerosol. Soluzioni gassose, liquide e solide. L’acqua come solvente polare. Solubilità: soluti ionici e non ionici. Proprietà degli elettroliti. Gli elettroliti nei fluidi biologici. Solubilità dei gas nei liquidi: la legge di Henry.",
              { keywords: ["soluzioni", "solubilità", "legge di Henry", "elettroliti"] },
            ),
            topic(
              "chim-concentrazioni",
              "Unità di concentrazione e legge di Dalton",
              "Unità di misura della concentrazione delle soluzioni: percentuali peso/peso, peso/volume, volume/volume. Molarità, molalità, frazione molare. Cenni sulle soluzioni non ideali: il comportamento dei soluti nello spazio intracellulare e coefficiente di attività. Il concetto di equivalente in ambito biomedico. La concentrazione nelle miscele di gas: la legge di Dalton. L’aria e la sua composizione, aria inspirata e aria espirata.",
              { keywords: ["molarità", "molalità", "equivalente", "Dalton"] },
            ),
          ],
        },
        {
          id: "chim-u2-c2",
          title: "Proprietà colligative e osmosi",
          topics: [
            topic(
              "chim-colligative",
              "Proprietà colligative e legge di Raoult",
              "Definizione di proprietà colligative: Interazioni tra solvente e soluto. La legge di Raoult. Abbassamento della pressione di vapore. Innalzamento della temperatura di ebollizione. Abbassamento della temperatura di congelamento. Pressione osmotica e passaggio di soluti attraverso le membrane.",
              { keywords: ["proprietà colligative", "Raoult", "crioscopia", "ebullioscopia"] },
            ),
            topic(
              "chim-osmosi",
              "Osmosi, osmolarità e tonicità delle soluzioni",
              "Soluzioni elettrolitiche e fattore correttivo di van’t Hoff: Diffusione, osmosi, osmolarità e osmolalità. Confronto tra le proprietà osmotiche delle soluzioni. Pressione osmotica dei liquidi intracellulari ed extracellulari. Soluzioni isotoniche, ipertoniche e ipotoniche. Soluzione fisiologica e glucosata. Esempi di implicazioni fisiopatologiche del disequilibrio osmotico (emolisi e edema).",
              { hasLesson: true, keywords: ["osmosi", "osmolarità", "van't Hoff", "isotonica", "pressione osmotica", "emolisi"] },
            ),
          ],
        },
      ],
    },
    {
      id: "chim-u3",
      number: 3,
      title: "Le reazioni chimiche negli organismi viventi: caratteristiche generali, cinetica e equilibrio chimico",
      cfu: 0.5,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "chim-u3-c1",
          title: "Reazioni, cinetica ed equilibrio",
          topics: [
            topic(
              "chim-reazioni",
              "Reazioni chimiche e bilanciamento",
              "Definizioni delle reazioni chimiche: Conservazione di massa, energia, carica elettrica e bilanciamento delle reazioni chimiche.",
            ),
            topic(
              "chim-cinetica",
              "Cinetica chimica, energia di attivazione e catalizzatori",
              "Definizione di cinetica di reazione: Reazioni a più stadi. Fattori che influenzano la velocità di una reazione. Ordine di reazione e molecolarità. La legge di Arrhenius e la teoria degli urti efficaci. L’energia di attivazione. La teoria dello stato di transizione. Definizione di catalizzatore e cenni sui catalizzatori biologici, gli enzimi.",
              { keywords: ["cinetica", "Arrhenius", "energia di attivazione", "catalizzatore"] },
            ),
            topic(
              "chim-equilibrio",
              "Equilibrio chimico e prodotto di solubilità",
              "L’equilibrio chimico: Reazioni reversibili ed irreversibili. Costante di equilibrio e legge d’azione di massa. Variazione di energia libera e equilibrio di reazione. Differenza tra equilibrio chimico e stato stazionario. Principio dell’equilibrio mobile. Il quoziente di reazione. Effetto della temperatura sulla costante di equilibrio. Equilibri multipli. Esempi di equilibrio eterogeneo solido-liquido (precipitazione di urati). Prodotto di solubilità, effetto dello ione in comune. Esempi di rilevanza biomedica (calcoli renali).",
              { keywords: ["equilibrio", "Le Chatelier", "Kps", "costante di equilibrio"] },
            ),
          ],
        },
      ],
    },
    {
      id: "chim-u4",
      number: 4,
      title: "Acidi, basi, sali, pH, soluzioni tampone; reazioni di ossido-riduzione ed elettrochimica",
      cfu: 1,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "chim-u4-c1",
          title: "Acidi, basi e tamponi",
          topics: [
            topic(
              "chim-acidi-basi",
              "Teorie acido-base, Kw e pH",
              "Le teorie acido-base: La teoria di Arrhenius. La teoria di Brønsted e Lowry. Cenni sulla teoria di Lewis. La reazione di auto-protolisi dell’acqua. La Kw. Il concetto di pH e pOH. Costanti di dissociazione, Ka e Kb. Acidi e basi forti, acidi e basi deboli, pKa e pKb. Indicatori di pH. Il pH di una soluzione di acido/base forte o di acido/base debole. Acidi poliprotici e basi poliprotiche. Reazioni acido-base. I sali, comportamento acido o basico dei sali in acqua. Solubilità e pH, esempi di interesse biomedico: ossalato di calcio, fosfato di calcio e urato di sodio.",
              { keywords: ["pH", "Brønsted", "Ka", "pKa", "Kw", "acidi forti"] },
            ),
            topic(
              "chim-tamponi",
              "Soluzioni tampone ed equazione di Henderson-Hasselbalch",
              "Soluzioni tampone: esempi di tamponi di acidi deboli e basi deboli. L’equazione di Henderson e Hasselbalch. Efficienza di un sistema tampone.",
              { hasLesson: true, keywords: ["tampone", "Henderson-Hasselbalch", "bicarbonato", "acidosi", "alcalosi", "pKa"] },
            ),
            topic(
              "chim-tamponi-sangue",
              "L’equilibrio acido-base nei fluidi biologici",
              "L’equilibrio acido-base nei fluidi biologici: il pH del sangue e i tamponi del sangue. Il tampone acido carbonico (CO₂)/bicarbonato, il tampone diidrogeno fosfato/idrogenofosfato, le proteine come sistemi tampone. L’importanza e la funzione dei tamponi in ambito biomedico (acidosi e alcalosi).",
              { keywords: ["pH del sangue", "bicarbonato", "acidosi", "alcalosi"] },
            ),
          ],
        },
        {
          id: "chim-u4-c2",
          title: "Ossido-riduzione ed elettrochimica",
          topics: [
            topic(
              "chim-redox",
              "Reazioni redox, potenziali ed equazione di Nernst",
              "Le reazioni di ossido-riduzione: Cella galvanica e definizione di anodo e catodo. Le semireazioni e i potenziali redox standard. L’equazione di Nernst. Relazione tra variazione di energia libera di Gibbs e differenza di potenziale. Reazioni spontanee e lavoro chimico. Esempi di reazioni di ossido-riduzione in ambito biologico. Ossigeno come accettore di elettroni: bilancio termodinamico della respirazione cellulare. Le reazioni di Fenton e Haber-Weiss come esempio di reazioni di ossido-riduzione non enzimatiche dell’ossigeno in presenza dello ione Ferro per la formazione del radicale idrossilico.",
              { keywords: ["redox", "Nernst", "potenziale standard", "Fenton"] },
            ),
          ],
        },
      ],
    },
    {
      id: "chim-u5",
      number: 5,
      title: "Proprietà del carbonio e reattività dei composti organici, idrocarburi, alogenuri alchilici, idrocarburi aromatici e derivati",
      cfu: 0.5,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "chim-u5-c1",
          title: "Il carbonio, stereochimica e meccanismi",
          topics: [
            topic(
              "chim-carbonio",
              "Proprietà del carbonio e nomenclatura IUPAC",
              "Proprietà e ibridazione del carbonio: Rappresentazione dei composti carboniosi. Idrocarburi saturi ed insaturi, ciclici ed eterociclici. Regole generali di nomenclatura IUPAC.",
            ),
            topic(
              "chim-stereochimica",
              "Stereochimica",
              "Stereochimica: diastereoisomeri, enantiomeri, epimeri e miscele racemiche. Cenni sulle regole di priorità e convenzione R/S. Potere ottico rotatorio specifico. Convenzione destrogira/levogira. Convenzione di Fischer.",
              { keywords: ["enantiomeri", "chiralità", "R/S", "Fischer"] },
            ),
            topic(
              "chim-meccanismi",
              "Rotture di legame, nucleofili, elettrofili, SN1/SN2",
              "Rottura omolitica del legame chimico e reazioni radicaliche. Rottura eterolitica del legame chimico: Carbocationi e carboanioni e loro stabilità. Effetto induttivo: elettron donatore, elettron attrattore. Delocalizzazione degli elettroni. Nucleofili ed elettrofili biologicamente rilevanti. Reazioni di sostituzione nucleofila con meccanismo SN2 e SN1 e reazioni di eliminazione.",
              { keywords: ["SN1", "SN2", "nucleofilo", "carbocatione"] },
            ),
          ],
        },
        {
          id: "chim-u5-c2",
          title: "Idrocarburi",
          topics: [
            topic(
              "chim-alcani-alcheni",
              "Alcani, cicloalcani e alcheni",
              "Alcani e cicloalcani: struttura, nomenclatura, proprietà chimico-fisiche e rilevanza biomedica. Tensione di legame nei cicloalcani. Reazioni: ossidazione. Alcheni: struttura, nomenclatura, proprietà chimico-fisiche e rilevanza biomedica. Delocalizzazione elettronica e dieni coniugati. Reazioni: addizione elettrofila.",
            ),
            topic(
              "chim-aromatici",
              "Idrocarburi aromatici",
              "Idrocarburi aromatici: struttura, nomenclatura, proprietà chimico-fisiche e rilevanza biomedica. Il benzene e composti aromatici eterociclici (pirimidine) e policiclici (purine). Regola di Hückel. Cenni sulle reazioni dei composti derivati del benzene: sostituzione elettrofila aromatica. Effetto attivante e disattivante dei sostituenti. Tossicità dei composti aromatici.",
              { keywords: ["benzene", "aromaticità", "Hückel", "purine"] },
            ),
          ],
        },
      ],
    },
    {
      id: "chim-u6",
      number: 6,
      title: "I gruppi funzionali e isomerie: alcoli, fenoli, eteri, tioli e tioeteri; aldeidi e chetoni; acidi carbossilici e derivati, ammine e ammidi",
      cfu: 1,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "chim-u6-c1",
          title: "Gruppi funzionali",
          topics: [
            topic(
              "chim-alcoli",
              "Alcoli, tioli, fenoli ed eteri",
              "Alcoli e tioli: struttura, nomenclatura, proprietà chimico-fisiche e rilevanza biologica. Reazioni: disidratazione, ossidazione, sostituzione nucleofila. Etanolo. Fenolo e derivati: acidità del fenolo. Esempi di alcoli e tioli di rilevanza biologica. Eteri e tioeteri. Epossidi.",
            ),
            topic(
              "chim-ammine",
              "Ammine",
              "Ammine: struttura, nomenclatura, proprietà chimico-fisiche e rilevanza biomedica. Basicità e nucleofilicità. Reazioni: alchilazione, formazione di sali. Nitrosammine. Colina e altri esempi di ammine di rilevanza biologica.",
            ),
            topic(
              "chim-carbonilici",
              "Aldeidi e chetoni",
              "Aldeidi e Chetoni: struttura, nomenclatura, proprietà chimico-fisiche e rilevanza biologica. Reazioni: ossidazione, riduzione, addizione nucleofila, condensazione aldolica. Emiacetali ed emichetali, acetali e chetali, immine o basi di Schiff. Proprietà dell’idrogeno in alfa al carbonile. Tautomeria cheto-enolica e sua importanza biologica (urato, citosina e fosfoenolpiruvato). Chinoni ed idrochinoni: ubichinone e suo ruolo come trasportatore di elettroni.",
              { keywords: ["aldeidi", "chetoni", "emiacetale", "tautomeria", "basi di Schiff"] },
            ),
            topic(
              "chim-acidi-carbossilici",
              "Acidi carbossilici e derivati",
              "Acidi carbossilici e loro derivati di interesse biologico (anidridi, esteri e tioesteri, ammidi, acilfosfati): struttura, nomenclatura, proprietà chimico-fisiche, acidità. Reazioni con esempi biologici: salificazione, decarbossilazione, sostituzione nucleofila acilica; esterificazione di Fischer; idrolisi degli esteri e transesterificazione; condensazione di Claisen di esteri e tioesteri. Formazione dei lattoni. Decarbossilazione dei chetoacidi. Idrolisi delle ammidi.",
              { keywords: ["acidi carbossilici", "esteri", "tioesteri", "Claisen"] },
            ),
          ],
        },
      ],
    },
    {
      id: "chim-u7",
      number: 7,
      title: "Amminoacidi e proteine, carboidrati, lipidi, nucleotidi, polinucleotidi e acidi nucleici",
      cfu: 1,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "chim-u7-c1",
          title: "Biomolecole",
          topics: [
            topic(
              "chim-amminoacidi",
              "Amminoacidi e punto isoelettrico",
              "Amminoacidi: Struttura, nomenclatura e nomi abbreviati. Classificazione in base alla catena laterale e alle sue proprietà. Identificazione e caratteristiche delle catene laterali degli amminoacidi proteici. Stereochimica degli amminoacidi e rappresentazione secondo la convenzione di Fischer. Proprietà acido-base degli amminoacidi e punto isoelettrico. Amminoacidi essenziali e non essenziali.",
              { keywords: ["amminoacidi", "punto isoelettrico", "zwitterione"] },
            ),
            topic(
              "chim-legame-peptidico",
              "Legame peptidico e livelli strutturali delle proteine",
              "Il legame peptidico: la sua formazione dalla reazione di un amminoacido esterificato con il gruppo amminico di un altro amminoacido. Caratteristiche del legame peptidico. Definizione dei livelli strutturali delle proteine: struttura primaria, secondaria, terziaria e quaternaria. Interazioni deboli e ponti disolfuro.",
            ),
            topic(
              "chim-carboidrati",
              "Carboidrati",
              "Carboidrati: struttura, nomenclatura e stereochimica dei carboidrati. Monosaccaridi: isomeri, epimeri, anomeri e tautomeri. Ciclizzazione dei monosaccaridi. Mutarotazione. Reazioni dei monosaccaridi: ossidazione, riduzione, reazione di Maillard e prodotti di Amadori, condensazione. Il legame glicosidico. Disaccaridi. Oligosaccaridi e loro derivati. Amminozuccheri. Polisaccaridi: omopolisaccaridi (amido, cellulosa, glicogeno) ed eteropolisaccaridi (glicosamminoglicani).",
              { keywords: ["glucosio", "anomeri", "legame glicosidico", "glicogeno"] },
            ),
            topic(
              "chim-lipidi",
              "Acidi grassi, lipidi complessi e colesterolo",
              "Acidi grassi saturi e insaturi: struttura, nomenclatura, proprietà fisiche e reazioni. I trigliceridi e le loro funzioni: oli e grassi. Lipidi complessi: glicerofosfolipidi, sfingolipidi, glicolipidi. Colesterolo e cenni sui suoi derivati di interesse biologico (ormoni steroidei, acidi biliari e vitamina D).",
            ),
            topic(
              "chim-nucleotidi",
              "Nucleotidi, ATP, coenzimi redox e acidi nucleici",
              "Basi azotate, nucleosidi e nucleotidi: struttura, nomenclatura. Importanza biologica dell’ATP. I dinucleotidi nelle reazioni di ossido-riduzione biologiche (NAD⁺/NADH, FAD/FADH₂). Il legame fosfodiestere e la struttura degli acidi nucleici: DNA e RNA.",
              { keywords: ["ATP", "NAD", "FAD", "fosfodiestere"] },
            ),
            topic(
              "chim-danno-ossidativo",
              "Modificazioni non enzimatiche e antiossidanti",
              "Modificazioni non enzimatiche delle macromolecole biologiche: Deaminazione della citosina. Principali reazioni del radicale idrossilico con lipidi, proteine e DNA. Attività antiossidante non enzimatica dei tioli (glutatione) e delle molecole contenenti doppi legami coniugati (tocoferolo, carotenoidi).",
            ),
          ],
        },
      ],
    },
  ],
};
