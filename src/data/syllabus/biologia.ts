import type { Subject } from "@/lib/types";
import { topic } from "./helpers";

// Fonte: MUR, "Syllabus semestre filtro — Insegnamento di Biologia", versione 2026
// (notizia MUR del 19/06/2026). Testo riportato con sole correzioni tipografiche
// (spazi mancanti, refusi evidenti). Il raggruppamento in capitoli è editoriale.

export const biologia: Subject = {
  id: "biologia",
  name: "Biologia",
  shortName: "Bio",
  cfu: 6,
  tagline: "Dalla molecola alla cellula: le basi dei processi fisiologici e patologici.",
  generalObjective:
    "Fornire una preparazione solida e integrata sui fondamenti della biologia, quale base indispensabile per la comprensione dei processi fisiologici e patologici, affrontati nei successivi insegnamenti dell’area biomedica.",
  units: [
    {
      id: "bio-u1",
      number: 1,
      title: "Le basi dell’organizzazione biologica e molecolare della vita",
      cfu: 0.5,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "bio-u1-c1",
          title: "Organizzazione della vita, virus e procarioti",
          topics: [
            topic(
              "bio-albero-vita",
              "L’albero della vita e la teoria cellulare",
              "L’albero della vita. Gli organismi e la teoria cellulare. Le proprietà fondamentali della materia vivente.",
            ),
            topic(
              "bio-virus",
              "I virus",
              "I virus: Caratteristiche generali. L’acido nucleico, il capside e l’involucro membranoso. Le varie classi di virus animali. Il ciclo litico e lisogenico di un virus batterico. Il ciclo di un virus animale. Il ciclo di un retrovirus. Modalità di entrata e di uscita di un virus da una cellula animale.",
              { keywords: ["virus", "capside", "retrovirus", "batteriofago", "lisogenico"] },
            ),
            topic(
              "bio-procarioti",
              "La cellula procariotica",
              "La cellula procariotica: la membrana plasmatica, la parete, la membrana esterna, la capsula, le fimbrie e i pili, i flagelli. I batteri Gram positivi e Gram negativi (la colorazione di Gram). Gli eubatteri e gli archeobatteri. Trasferimento genico orizzontale nei batteri: trasformazione, coniugazione e trasduzione: caratteristiche e importanza biologica.",
              { keywords: ["batteri", "gram", "procarioti", "coniugazione", "trasduzione"] },
            ),
          ],
        },
        {
          id: "bio-u1-c2",
          title: "La cellula eucariotica",
          topics: [
            topic(
              "bio-eucarioti",
              "La cellula eucariotica e l’endosimbiosi",
              "La cellula eucariotica: Il sistema delle endomembrane. La generazione del nucleo, l’endosimbiosi per la generazione dei mitocondri. Dagli organismi unicellulari a quelli pluricellulari complessi.",
              { keywords: ["eucarioti", "endosimbiosi", "endomembrane"] },
            ),
          ],
        },
        {
          id: "bio-u1-c3",
          title: "Macromolecole biologiche e metabolismo",
          topics: [
            topic(
              "bio-carboidrati-lipidi",
              "Zuccheri, carboidrati e lipidi",
              "Le basi della struttura e funzione delle macromolecole biologiche: Gli zuccheri e i carboidrati. I lipidi.",
            ),
            topic(
              "bio-proteine-enzimi",
              "Proteine, enzimi e modificazioni post-traduzionali",
              "Proteine ed enzimi: Gli amminoacidi, il legame peptidico e le proteine e la struttura delle proteine, con i loro domini proteici e siti attivi. L’esempio degli enzimi con concetti di base e classi principali (es.: chinasi-fosfatasi, ubiquitinasi-deubiquitinasi, acetilasi-deacetilasi). Le principali modificazioni post-traduzionali delle proteine (es.: la fosforilazione, l’acetilazione, la glicosilazione e l’aggiunta di lipidi).",
              { keywords: ["proteine", "enzimi", "chinasi", "fosforilazione", "amminoacidi"] },
            ),
            topic(
              "bio-acidi-nucleici",
              "Nucleotidi, acidi nucleici e RNA",
              "Nucleotidi e acidi nucleici: I nucleotidi e gli acidi nucleici. Il modello di Watson e Crick e la doppia elica del DNA. Gli RNA: struttura e funzioni. RNA codificanti e non codificanti.",
              { keywords: ["DNA", "RNA", "Watson", "Crick", "doppia elica", "nucleotidi"] },
            ),
            topic(
              "bio-metabolismo-basi",
              "Aspetti di base del metabolismo",
              "Gli aspetti di base del metabolismo: i concetti di anabolismo e catabolismo, le reazioni di condensazione e di idrolisi.",
              { keywords: ["metabolismo", "anabolismo", "catabolismo", "idrolisi"] },
            ),
          ],
        },
      ],
    },
    {
      id: "bio-u2",
      number: 2,
      title: "I meccanismi cellulari di trasmissione e controllo dell’informazione genetica e epigenetica",
      cfu: 0.5,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "bio-u2-c1",
          title: "Genoma, cromatina ed epigenetica",
          topics: [
            topic(
              "bio-genoma-eucariotico",
              "Il genoma delle cellule eucariotiche",
              "Il genoma delle cellule eucariotiche: I cromosomi lineari delle cellule eucariotiche. Organizzazione minimale di un cromosoma eucariotico. Il DNA centromerico e telomerico.",
            ),
            topic(
              "bio-cromatina",
              "La cromatina e l’epigenetica",
              "La cromatina: I nucleosomi. L’impaccamento del DNA e le proteine istoniche. L’istone H1 e la fibra di 30 nm. L’eucromatina e l’eterocromatina, la metilazione del DNA. Il rimodellamento della cromatina. Le modificazioni post-traduzionali degli istoni e l’epigenetica (l’esempio dell’acetilazione). Le condensine e il ripiegamento della cromatina.",
              { keywords: ["cromatina", "nucleosomi", "istoni", "epigenetica", "metilazione"] },
            ),
            topic(
              "bio-genoma-umano",
              "Il genoma umano",
              "Il genoma umano: organizzazione e caratteristiche delle sequenze che lo compongono. Sequenze singole, famiglie geniche (globine, RNA ribosomiali), sequenze ripetute, sequenze ripetute in tandem (minisatelliti, microsatelliti), sequenze ripetute intersperse (LINE, SINE e retrovirus endogeni). Gli elementi mobili del DNA.",
            ),
          ],
        },
      ],
    },
    {
      id: "bio-u3",
      number: 3,
      title: "Il flusso dell’informazione",
      cfu: 1.0,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "bio-u3-c1",
          title: "Replicazione e struttura dei geni",
          topics: [
            topic(
              "bio-replicazione-dna",
              "La replicazione del DNA",
              "La replicazione del DNA nei procarioti e negli eucarioti: il meccanismo semiconservativo. Le origini di replicazione, la formazione del complesso d’inizio e la forcella replicativa. Lo srotolamento del DNA: le DNA elicasi e le topoisomerasi. La primasi e l’innesco della replicazione. Le DNA polimerasi e le attività di correzione degli errori. Il filamento continuo e discontinuo e i frammenti di Okazaki. La rimozione dell’RNA e la DNA ligasi. La funzione dei telomeri e delle telomerasi. I telomeri e la senescenza replicativa.",
              { hasLesson: true, keywords: ["replicazione", "DNA polimerasi", "Okazaki", "telomerasi", "elicasi", "forcella"] },
            ),
            topic(
              "bio-geni",
              "Il concetto di gene",
              "I geni: il concetto di gene e l’anatomia del gene procariotico ed eucariotico. Geni policistronici e monocistronici. Promotori ed elementi regolativi in cis.",
            ),
          ],
        },
        {
          id: "bio-u3-c2",
          title: "Trascrizione e regolazione genica",
          topics: [
            topic(
              "bio-operone-lac",
              "Trascrizione nei procarioti e operone Lac",
              "La trascrizione nei procarioti e la sua regolazione con il modello dell’operone Lac.",
              { keywords: ["operone", "lac", "trascrizione procarioti"] },
            ),
            topic(
              "bio-controllo-espressione",
              "Il controllo dell’espressione genica negli eucarioti",
              "Il controllo dell’espressione genica negli eucarioti: trascrizionale, post-trascrizionale, traduzionale e post-traduzionale.",
            ),
            topic(
              "bio-trascrizione-eucarioti",
              "La trascrizione negli eucarioti",
              "La trascrizione negli eucarioti: Le tre RNA polimerasi (I, II, III). I fattori di trascrizione generali. La TATA box. Promotori prossimali e distali (enhancer e silencer). I fattori di trascrizione specifici: l’esempio dei recettori degli ormoni steroidei. Inizio, allungamento e terminazione della trascrizione negli eucarioti.",
              { keywords: ["RNA polimerasi", "TATA", "enhancer", "trascrizione"] },
            ),
            topic(
              "bio-maturazione-rna",
              "La maturazione degli RNA",
              "La maturazione degli RNA: RNA messaggero: il capping, la poliadenilazione, lo splicing e lo splicing alternativo, lo spliceosoma e gli snRNA. I ribozimi. Editing del RNA. La regolazione della stabilità del messaggero (deadenilazione e decapucciamento, miRNA e RNA interference). La maturazione degli rRNA e dei tRNA.",
              { keywords: ["splicing", "capping", "poliadenilazione", "miRNA"] },
            ),
          ],
        },
        {
          id: "bio-u3-c3",
          title: "Traduzione e destino delle proteine",
          topics: [
            topic(
              "bio-traduzione",
              "La sintesi delle proteine e il codice genetico",
              "La sintesi delle proteine: il meccanismo della traduzione. Gli attori della traduzione: rRNA, tRNA e mRNA. La formazione degli aminoacil-tRNA. I ribosomi. Il codice genetico, i codoni e gli anticodoni. La ridondanza, la degenerazione, la non ambiguità e l’universalità del codice genetico. Le regioni non tradotte del mRNA e la loro funzione regolatoria. I fattori di inizio, di allungamento e di terminazione nella traduzione.",
              { keywords: ["traduzione", "ribosomi", "codice genetico", "tRNA", "codone"] },
            ),
            topic(
              "bio-folding",
              "Ripiegamento delle proteine e chaperon",
              "La maturazione delle proteine: l’importanza del corretto ripiegamento delle proteine. Le proteine chaperon. Gli errori di ripiegamento delle proteine.",
            ),
            topic(
              "bio-proteasoma",
              "Degradazione proteasomica e ubiquitina",
              "La regolazione dell’attività biologica delle proteine: degradazione delle proteine. Degradazione proteasomica ubiquitina-dipendente. Proteine simili all’ubiquitina.",
            ),
          ],
        },
      ],
    },
    {
      id: "bio-u4",
      number: 4,
      title: "I meccanismi cellulari di trasmissione e controllo dei caratteri selvatici e mutati",
      cfu: 0.75,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "bio-u4-c1",
          title: "Mutazioni e genetica mendeliana",
          topics: [
            topic(
              "bio-mutazioni",
              "Variazioni del genoma e riparazione del DNA",
              "Le variazioni del genoma: sostituzione, inserzione o delezione di nucleotidi. Mutazioni geniche e cromosomiche. Il fenomeno dell’espansione di sequenze ripetute. Principi generali sui meccanismi di riparazione del danno al DNA su singolo e doppio filamento.",
              { keywords: ["mutazioni", "riparazione", "delezione"] },
            ),
            topic(
              "bio-mendel",
              "Alleli, leggi di Mendel ed eccezioni",
              "Gli alleli: Omozigosi, eterozigosi ed eterozigosi composta. Dominanza e recessività. Genotipo e fenotipo. Le leggi di Mendel. I caratteri singoli, la segregazione, l’assortimento indipendente. Dominanza incompleta e codominanza. Alleli multipli (poliallelia, sistema AB0 dei gruppi sanguigni). La pleiotropia. Epistasi (rapporti mendeliani atipici). Associazione completa e incompleta. Mappe fisiche e genetiche.",
              { keywords: ["Mendel", "alleli", "AB0", "dominanza", "epistasi"] },
            ),
            topic(
              "bio-penetranza",
              "Penetranza, espressività ed eredità quantitativa",
              "L’espressione genica modulata dall’ambiente: il concetto di penetranza ed espressività, caratteri poligenici ed eredità quantitativa. Imprinting genomico.",
            ),
          ],
        },
        {
          id: "bio-u4-c2",
          title: "Cromosomi umani ed ereditarietà",
          topics: [
            topic(
              "bio-cariotipo",
              "Cromosomi umani e cariotipo",
              "Cromosomi umani e cariotipo: La diploidia e i cromosomi omologhi. La tecnica del bandeggio. Euploidia ed alterazioni del cariotipo umano: variazioni del numero dei cromosomi (aneuploidia, poliploidia) e della struttura dei cromosomi (traslocazioni, inversioni, delezioni e inserzioni). L’esempio della trisomia del cromosoma 21.",
              { keywords: ["cariotipo", "aneuploidia", "trisomia 21", "traslocazioni"] },
            ),
            topic(
              "bio-alberi-genealogici",
              "Alberi genealogici e modalità di trasmissione",
              "Gli alberi genealogici: Ereditarietà autosomica (dominante e recessiva), ereditarietà associata al cromosoma X (dominante e recessiva), al cromosoma Y, ereditarietà mitocondriale.",
              { keywords: ["albero genealogico", "autosomica", "X-linked", "mitocondriale"] },
            ),
          ],
        },
      ],
    },
    {
      id: "bio-u5",
      number: 5,
      title: "Le strutture cellulari: biogenesi, morfologia e funzioni",
      cfu: 1.75,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "bio-u5-c1",
          title: "Membrane, trasporto e smistamento",
          topics: [
            topic(
              "bio-membrane",
              "Le membrane e il modello a mosaico fluido",
              "Le membrane e i loro componenti: Il modello a mosaico fluido. L’importanza del glicocalice. Asimmetria di membrana.",
              { keywords: ["membrana", "mosaico fluido", "glicocalice"] },
            ),
            topic(
              "bio-trasporto-membrana",
              "Il trasporto attraverso la membrana plasmatica",
              "Il trasporto attraverso la membrana plasmatica: Osmosi, diffusione, trasporto passivo. Le proteine canale e i trasportatori. Il trasporto attivo. L’esempio delle pompe ATPasi e dei trasportatori ABC. Aspetti biologici del potenziale di membrana e del potenziale d’azione.",
              { keywords: ["trasporto", "pompa sodio potassio", "potenziale di membrana", "ATPasi"] },
            ),
            topic(
              "bio-smistamento",
              "Lo smistamento delle proteine",
              "Lo smistamento delle proteine: i diversi compartimenti cellulari e le loro relazioni topologiche. I segnali di indirizzamento ai compartimenti.",
            ),
          ],
        },
        {
          id: "bio-u5-c2",
          title: "Nucleo, mitocondri e perossisomi",
          topics: [
            topic(
              "bio-nucleo",
              "Il nucleo e il trasporto nucleare",
              "Il nucleo: l’involucro nucleare. Il nucleolo e gli altri condensati nucleari. I pori nucleari. Le nucleoporine. Il trasporto nucleare. I segnali di localizzazione nucleare e di esportazione nucleare. Il ruolo delle importine, delle esportine, della proteina Ran, RanGEF e RanGAP. Regolazione dell’importazione nucleare (esempi: recettore degli ormoni steroidei, NFkB, SREBP1). Trasporto degli RNA dal nucleo al citosol.",
              { keywords: ["nucleo", "pori nucleari", "Ran", "importine"] },
            ),
            topic(
              "bio-mitocondri",
              "I mitocondri e la respirazione cellulare",
              "I mitocondri: struttura e funzioni. Il genoma mitocondriale e le modalità del flusso dell’informazione nei mitocondri. Aspetti biologici di energetica: la glicolisi, la respirazione cellulare (il ciclo degli acidi tricarbossilici, la catena di trasporto degli elettroni, la sintesi di ATP), e il bilancio energetico del processo. Il network mitocondriale e le sue dinamiche: fusione, fissione e le proteine regolatorie. Il trasporto ai mitocondri: i traslocatori TOM, TIM, SAM e OXA per l’importazione delle proteine alla matrice mitocondriale, alla membrana mitocondriale esterna, alla membrana mitocondriale interna e allo spazio intermembrana.",
              {
                hasLesson: true,
                keywords: ["mitocondri", "ciclo di Krebs", "fosforilazione ossidativa", "catena di trasporto", "ATP sintasi", "glicolisi", "respirazione cellulare"],
              },
            ),
            topic(
              "bio-perossisomi",
              "I perossisomi",
              "I perossisomi: struttura e funzioni biosintetiche, cataboliche e detossificanti. Le peculiarità del trasporto ai perossisomi. Il trasporto mediato da sequenze segnale e recettori. Le perossine e la biogenesi dei perossisomi. Patologie legate ai perossisomi (sindrome di Zellweger).",
            ),
          ],
        },
        {
          id: "bio-u5-c3",
          title: "Via secretoria, traffico vescicolare e degradazione",
          topics: [
            topic(
              "bio-via-secretoria",
              "La via secretoria e il controllo di qualità del RE",
              "La via secretoria: il reticolo endoplasmatico liscio e ruvido, il cis-Golgi network, l’apparato di Golgi e il trans-Golgi network. Il trasporto al reticolo endoplasmatico: la sequenza di indirizzamento, SRP ed il suo recettore, il traslocone, la peptidasi del segnale. Le modificazioni delle proteine neosintetizzate nel reticolo endoplasmatico. La glicosilazione ed il suo ruolo nel ripiegamento delle proteine tramite calnexina e calreticulina. Il controllo di qualità del reticolo endoplasmatico (esempi: calnexina e immunoglobuline). Ruolo delle proteine chaperon durante la traduzione ed il trasporto agli organelli. Le risposte UPR e l’attivazione del sistema ERAD. L’esempio della fibrosi cistica. Secrezione costitutiva e secrezione regolata.",
              { keywords: ["reticolo endoplasmatico", "Golgi", "SRP", "UPR", "fibrosi cistica"] },
            ),
            topic(
              "bio-traffico-vescicolare",
              "Il traffico vescicolare",
              "Il traffico vescicolare: formazione delle vescicole. Le proteine di rivestimento e i loro ruoli. L’attracco, l’ormeggio e la fusione di vescicole ai compartimenti bersaglio. Ruolo di NSF, SNAPs, SNARE e RAB. Il ruolo dei fosfoinositidi.",
            ),
            topic(
              "bio-endocitosi",
              "Endocitosi, lisosomi e transcitosi",
              "L’endocitosi: endocitosi in fase fluida e mediata da recettori. Endocitosi della transferrina, delle LDL e dell’EGF: differenze e peculiarità. Endosomi precoci di smistamento e di riciclo, endosomi tardivi, corpi multivescicolari e lisosomi. Il trasporto ai lisosomi e il mannosio-6-fosfato. Disfunzioni lisosomali e malattie di accumulo. L’endocitosi nelle cellule polarizzate. La transcitosi (esempio delle immunoglobuline). La fagocitosi e le sue funzioni.",
              { keywords: ["endocitosi", "lisosomi", "LDL", "mannosio-6-fosfato"] },
            ),
            topic(
              "bio-autofagia",
              "L’autofagia",
              "L’autofagia: macroautofagia, microautofagia e autofagia mediata da chaperon molecolari. L’esempio della mitofagia. Conseguenze delle alterazioni della via autofagica.",
            ),
          ],
        },
        {
          id: "bio-u5-c4",
          title: "Il citoscheletro",
          topics: [
            topic(
              "bio-microtubuli",
              "I microtubuli, motori molecolari, ciglia e flagelli",
              "I microtubuli: Struttura e funzione dei microtubuli. Formazione, allungamento e accorciamento dei microtubuli. Il ruolo del GTP nella stabilità dei microtubuli. Il centrosoma e il complesso γTuRC. Proteine MAP motrici e non motrici. Le dineine e le chinesine. Esempi di alterazioni nelle dineine citoplasmatiche. Le ciglia e i flagelli.",
              { keywords: ["microtubuli", "chinesine", "dineine", "centrosoma"] },
            ),
            topic(
              "bio-actina",
              "I microfilamenti di actina e la migrazione cellulare",
              "I microfilamenti: struttura e funzioni dei microfilamenti di actina. Il processo di polimerizzazione dell’actina: il ruolo dell’ATP e il complesso Arp2/3. Le proteine accessorie dell’actina, le miosine, le proteine di collegamento: gli esempi della distrofina e del sarcomero. Regolazione del citoscheletro di actina tramite proteine della famiglia Rho (Rho, Rac e CDC42). La migrazione cellulare, l’esempio della polarizzazione e chemiotassi dei neutrofili.",
              { keywords: ["actina", "miosina", "Arp2/3", "Rho", "distrofina"] },
            ),
            topic(
              "bio-filamenti-intermedi",
              "I filamenti intermedi e le connessioni del citoscheletro",
              "I filamenti intermedi: Polimerizzazione, struttura e funzioni. Le cheratine e la lamina nucleare. I legami tra diversi elementi del citoscheletro. Le connessioni tra nucleoscheletro e citoscheletro.",
            ),
          ],
        },
      ],
    },
    {
      id: "bio-u6",
      number: 6,
      title: "La cellula e l’ambiente, la segnalazione cellulare e la trasduzione del segnale",
      cfu: 0.75,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "bio-u6-c1",
          title: "Matrice extracellulare e giunzioni",
          topics: [
            topic(
              "bio-matrice",
              "La matrice extracellulare e le integrine",
              "La matrice extracellulare: struttura e funzioni. Degradazione della matrice extracellulare. Ancoraggio alla matrice tramite le integrine. Le basi generali della meccanotrasduzione e le connessioni con il citoscheletro. L’esempio della fibronectina.",
            ),
            topic(
              "bio-giunzioni",
              "Comunicazione tra cellule e giunzioni cellulari",
              "La comunicazione tra cellule: Il riconoscimento tra cellule e la formazione dei tessuti (caderine e CAM). I diversi tipi di giunzioni cellulari: giunzioni occludenti, giunzioni aderenti, desmosomi ed emidesmosomi, giunzioni comunicanti.",
              { keywords: ["giunzioni", "caderine", "desmosomi", "gap junction"] },
            ),
          ],
        },
        {
          id: "bio-u6-c2",
          title: "Segnalazione e trasduzione del segnale",
          topics: [
            topic(
              "bio-segnalazione",
              "Segnalazione cellulare, recettori e secondi messaggeri",
              "La segnalazione cellulare: da contatto, autocrina, paracrina, endocrina e sinaptica. La trasduzione del segnale: elementi costitutivi e cascate regolative. I recettori di membrana e i recettori intracellulari. L’esempio dell’ossido nitrico e gli ormoni lipidici. I recettori accoppiati a canali ionici. I recettori accoppiati a proteine G: le proteine G monomeriche e trimeriche nella trasduzione del segnale. Le proteine regolatorie: GEF e GAP. Secondi messaggeri e amplificazione del segnale. Desensitizzazione recettoriale, l’esempio della visione.",
              { keywords: ["proteine G", "GPCR", "secondi messaggeri", "cAMP", "recettori"] },
            ),
            topic(
              "bio-rtk",
              "Recettori tirosin-chinasici, Ras-MAPK e insulina",
              "I recettori dotati di attività enzimatica: i recettori tirosin-chinasici, la via Ras-MAP chinasi. Gli oncogeni e la trasduzione del segnale. Segnalazione del recettore per l’insulina e del recettore per l’EGF. La segnalazione dei fosfoinositidi.",
              { keywords: ["tirosin-chinasi", "Ras", "MAPK", "insulina", "EGF"] },
            ),
          ],
        },
      ],
    },
    {
      id: "bio-u7",
      number: 7,
      title: "Il controllo della proliferazione e della sopravvivenza cellulare",
      cfu: 0.75,
      officialLead: "Descrivere e interpretare",
      chapters: [
        {
          id: "bio-u7-c1",
          title: "Ciclo cellulare e cancro",
          topics: [
            topic(
              "bio-ciclo-cellulare",
              "Il ciclo cellulare, cicline e CDK",
              "Il ciclo cellulare: le fasi e i punti di controllo. Le cicline e le chinasi dipendenti da ciclina e la loro modulazione.",
              { keywords: ["ciclo cellulare", "cicline", "CDK", "checkpoint"] },
            ),
            topic(
              "bio-restrizione",
              "Punto di restrizione, Rb, p53 e oncogeni",
              "Il superamento del punto di restrizione e l’entrata in fase S: il ruolo dei fattori di crescita. La ciclina D-Cdk4/6. Fosforilazione di Rb (proteina associata al retinoblastoma) e attivazione di E2F. Gli inibitori del complesso ciclina-CDK. Il danno al DNA e l’attivazione di p53 con l’induzione della riparazione del DNA o dell’apoptosi. Proto-oncogeni, oncogeni e geni oncosoppressori. I virus oncogeni.",
              { keywords: ["Rb", "E2F", "p53", "oncogeni", "oncosoppressori"] },
            ),
          ],
        },
        {
          id: "bio-u7-c2",
          title: "Mitosi, meiosi e morte cellulare",
          topics: [
            topic(
              "bio-mitosi",
              "Le fasi della mitosi e la citodieresi",
              "Le fasi della mitosi: L’ingresso in mitosi. La condensazione dei cromosomi. La formazione del fuso mitotico: i microtubuli astrali, del cinetocore e interpolari. I meccanoenzimi della mitosi, il disassemblaggio della lamina nucleare e la dinamica degli organelli intracellulari. Il complesso NDC80. Il movimento dei cromosomi e del fuso mitotico. Il completamento della mitosi: Il complesso APC/C o ciclosoma. La degradazione delle cicline e della securina. La separazione dei cromatidi fratelli. La citodieresi. La mitosi asimmetrica.",
              { keywords: ["mitosi", "fuso mitotico", "APC/C", "citodieresi"] },
            ),
            topic(
              "bio-meiosi",
              "La meiosi, il crossing over e la gametogenesi",
              "La meiosi: Meccanismo molecolare della meiosi delle cellule germinali e sue conseguenze genetiche. Il crossing over. Le differenze tra mitosi e meiosi. Cause di aneuploidia. La meiosi nella gametogenesi umana maschile e femminile. Il concetto della cellula staminale.",
              { keywords: ["meiosi", "crossing over", "gametogenesi", "staminali"] },
            ),
            topic(
              "bio-apoptosi",
              "Necrosi e apoptosi",
              "La morte cellulare: necrosi e apoptosi. La via apoptotica intrinseca ed estrinseca. Le caspasi iniziatrici ed esecutrici. La MOMP, il citocromo c e l’apoptosoma. Le proteine pro- e anti-apoptotiche (la famiglia di BCL2). I recettori di morte e le vie di segnalazione.",
              { keywords: ["apoptosi", "caspasi", "BCL2", "citocromo c", "necrosi"] },
            ),
          ],
        },
      ],
    },
  ],
};
