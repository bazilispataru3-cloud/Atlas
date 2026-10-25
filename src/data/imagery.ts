import type { SubjectId } from "@/lib/types";

/**
 * Scientific photographs with verified free licences (public domain, CC0, CC BY, CC BY-SA only).
 * Every licence was read on the source page before download; files were only resized and
 * converted to WebP (see IMAGE_CHANGES in components/imagery). Files live in public/images/science:
 * <slug>-1600.webp (max 1600 px wide) and <slug>-640.webp.
 * Render them with <ScienceFigure> so the credit always travels with the image.
 */

export type ImageContext = "academy" | "dashboard";

export interface ScienceImage {
  slug: string;
  /** Set on the one hero image of each subject. */
  subject?: SubjectId;
  /** Syllabus topic ids the image illustrates; the first image listing a topic is its picture. */
  topicIds: string[];
  /** Other places the image suits, beyond subjects and topics. */
  contexts?: ImageContext[];
  /** Italian title, used in captions and in the credit card. */
  title: string;
  /** Italian alt text: what is visible, with the scientific meaning of the colours. */
  alt: string;
  /** 1600 px file (or the original width when smaller). */
  src: string;
  /** 640 px file. */
  srcSmall: string;
  width: number;
  height: number;
  smallWidth: number;
  smallHeight: number;
  author: string;
  /** Short licence name as the source states it (e.g. "CC BY-SA 4.0"). */
  license: string;
  licenseUrl: string;
  /** Page where the licence was verified and the file was downloaded. */
  sourcePage: string;
  /** Name of the source site, for "via …". */
  via: "Wikimedia Commons" | "Flickr";
  /** Italian credit line, plain text. */
  credit: string;
  /** "Foto" (default) or "Micrografia". */
  creditPrefix?: string;
  /** object-position for crops (keeps the subject in frame). */
  position?: string;
}

const dir = "/images/science";
const file = (slug: string) => ({ src: `${dir}/${slug}-1600.webp`, srcSmall: `${dir}/${slug}-640.webp` });

const CC = {
  by2: "https://creativecommons.org/licenses/by/2.0/",
  by4: "https://creativecommons.org/licenses/by/4.0/",
  bysa3: "https://creativecommons.org/licenses/by-sa/3.0/",
  bysa4: "https://creativecommons.org/licenses/by-sa/4.0/",
};
/** Works of the US federal government, marked on the source with the Public Domain Mark. */
const PD_MARK = "https://creativecommons.org/publicdomain/mark/1.0/";

/** Topic pictures first, then subject heroes, then extras: imageForTopic returns the first match. */
export const IMAGES: ScienceImage[] = [
  // ── Topic pictures ─────────────────────────────────────────
  {
    slug: "mitocondri-osteosarcoma",
    topicIds: ["bio-mitocondri"],
    title: "Mitocondri in una cellula di osteosarcoma",
    alt: "Una cellula di osteosarcoma allungata su fondo nero al microscopio a fluorescenza: i mitocondri sono filamenti gialli raccolti attorno al nucleo azzurro, i filamenti di actina viola tendono la cellula.",
    ...file("mitocondri-osteosarcoma"),
    width: 1600,
    height: 1484,
    smallWidth: 640,
    smallHeight: 594,
    author: "Dylan Burnette e Jennifer Lippincott-Schwartz, NICHD/NIH",
    license: "Pubblico dominio",
    licenseUrl: PD_MARK,
    sourcePage: "https://www.flickr.com/photos/nihgov/20683459225/",
    via: "Flickr",
    credit: "Foto: Dylan Burnette e Jennifer Lippincott-Schwartz, NICHD/NIH, pubblico dominio, via Flickr",
    position: "45% 58%",
  },

  // ── Subject heroes ─────────────────────────────────────────
  {
    slug: "biologia-fibroblasti",
    subject: "biologia",
    topicIds: ["bio-actina", "bio-eucarioti"],
    contexts: ["dashboard"],
    title: "Fibroblasti di topo al microscopio a fluorescenza",
    alt: "Tre fibroblasti di topo su fondo nero: i nuclei sono blu, i mitocondri verdi e i filamenti di actina del citoscheletro rossi.",
    ...file("biologia-fibroblasti"),
    width: 1600,
    height: 1765,
    smallWidth: 640,
    smallHeight: 706,
    author: "D. Burnette e J. Lippincott-Schwartz, NICHD",
    license: "CC BY 2.0",
    licenseUrl: CC.by2,
    sourcePage: "https://www.flickr.com/photos/nichd/19124186316/",
    via: "Flickr",
    credit: "Foto: D. Burnette e J. Lippincott-Schwartz, NICHD, CC BY 2.0, via Flickr",
    position: "50% 28%",
  },
  {
    slug: "fisica-reattore-cerenkov",
    subject: "fisica",
    topicIds: ["fis-radioattivita", "fis-ionizzanti"],
    title: "Radiazione Čerenkov nel reattore HFIR",
    alt: "La piscina del reattore di ricerca HFIR di Oak Ridge vista dall'alto durante la ricarica: sotto l'acqua il combustibile esausto, radioattivo, emette il bagliore blu della radiazione Čerenkov.",
    ...file("fisica-reattore-cerenkov"),
    width: 1600,
    height: 1066,
    smallWidth: 640,
    smallHeight: 427,
    author: "Oak Ridge National Laboratory",
    license: "CC BY 2.0",
    licenseUrl: CC.by2,
    sourcePage: "https://www.flickr.com/photos/oakridgelab/19783046450/",
    via: "Flickr",
    credit: "Foto: Oak Ridge National Laboratory, CC BY 2.0, via Flickr",
    position: "50% 45%",
  },

  // ── Extras ─────────────────────────────────────────────────
  {
    slug: "ippocampo-interneuroni",
    topicIds: [],
    contexts: ["academy"],
    title: "Interneuroni dell'ippocampo, la regione della memoria",
    alt: "Sezione di ippocampo di topo su fondo nero: gli interneuroni inibitori che contengono parvalbumina brillano in verde lungo la curva dell'ippocampo.",
    ...file("ippocampo-interneuroni"),
    width: 1600,
    height: 1600,
    smallWidth: 640,
    smallHeight: 640,
    author: "Laboratorio McBain, NICHD/NIH",
    license: "Pubblico dominio",
    licenseUrl: PD_MARK,
    sourcePage: "https://www.flickr.com/photos/nihgov/42022416974/",
    via: "Flickr",
    credit: "Foto: Laboratorio McBain, NICHD/NIH, pubblico dominio, via Flickr",
    position: "50% 50%",
  },
];

const BY_SLUG = new Map(IMAGES.map((img) => [img.slug, img]));

export function imageBySlug(slug: string): ScienceImage | undefined {
  return BY_SLUG.get(slug);
}

/** The hero photograph of a subject. */
export function imageForSubject(id: SubjectId): ScienceImage | undefined {
  return IMAGES.find((img) => img.subject === id);
}

/** The photograph that illustrates a syllabus topic, if one exists. */
export function imageForTopic(topicId: string): ScienceImage | undefined {
  return IMAGES.find((img) => img.topicIds.includes(topicId));
}

/** Photographs suited to a place in the app (e.g. the Study Academy). */
export function imagesForContext(context: ImageContext): ScienceImage[] {
  return IMAGES.filter((img) => img.contexts?.includes(context));
}

/** srcset with both files, so the browser downloads 640 px on phones. */
export function scienceSrcSet(img: ScienceImage): string {
  return `${img.srcSmall} ${img.smallWidth}w, ${img.src} ${img.width}w`;
}
