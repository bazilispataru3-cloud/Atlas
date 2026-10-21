// Official exam rules for the "semestre filtro" a.a. 2026/2027.
// Every value below is taken from primary sources and carries its reference.

export const EXAM_RULES = {
  academicYear: "2026/2027",
  questionsPerExam: 31,
  multipleChoice: 21,
  optionsPerMultipleChoice: 5,
  completion: 10,
  minutesPerExam: 50,
  breakMinutes: 30,
  scoring: { correct: 1, blank: 0, wrong: -0.1 },
  maxPerExam: 31, // 30 + lode (valued 1 point)
  maxTotal: 93,
  passThreshold: 18,
  completionRule: "Risposta corretta mancante, espressiva di un solo e univoco concetto (stampatello maiuscolo).",
  sources: [
    {
      label: "D.M. n. 941 del 10/07/2026 — Semestre filtro a.a. 2026-2027 (artt. 6-8) e Allegato 2",
      url: "https://www.mur.gov.it/it/atti-e-normativa/decreto-ministeriale-n-941-del-10-7-2026",
    },
    {
      label: "MUR — “Medicina, al via le iscrizioni al Semestre aperto” (13/07/2026)",
      url: "https://www.mur.gov.it/it/news/lunedi-13072026/medicina-al-le-iscrizioni-al-semestre-aperto",
    },
  ],
  verifiedOn: "2026-10-19",
} as const;

export interface ExamDate {
  id: "appello-1" | "appello-2";
  label: string;
  /** ISO date-time in Europe/Rome. */
  date: string;
  results: string;
  note: string;
}

export const EXAM_DATES: ExamDate[] = [
  {
    id: "appello-1",
    label: "Primo appello",
    date: "2026-12-10T11:00:00+01:00",
    results: "2026-12-23",
    note: "Chimica e propedeutica biochimica, Fisica e Biologia — dalle ore 11:00",
  },
  {
    id: "appello-2",
    label: "Secondo appello",
    date: "2027-01-11T11:00:00+01:00",
    results: "2027-01-20",
    note: "Chimica e propedeutica biochimica, Fisica e Biologia — dalle ore 11:00",
  },
];

export const EXAM_DATES_SOURCE = {
  label: "D.D. n. 249 del 13/07/2026 (date delle prove); esiti dal comunicato MUR del 13/07/2026",
  url: "https://www.mur.gov.it/it/atti-e-normativa/decreto-direttoriale-n-249-del-13-7-2026",
  verifiedOn: "2026-10-19",
};

/** Raw score → grade out of 30 (+ lode) following DM 941/2026 art. 8. */
export function scoreExam(correct: number, wrong: number) {
  const raw = correct * EXAM_RULES.scoring.correct + wrong * EXAM_RULES.scoring.wrong;
  const rounded = Math.round(raw * 10) / 10;
  const passed = rounded >= EXAM_RULES.passThreshold;
  const lode = rounded >= 31;
  // The grade used for the career is rounded to the nearest unit only if passed.
  const careerGrade = passed ? Math.min(30, Math.round(rounded)) : null;
  return { raw: rounded, passed, lode, careerGrade };
}
