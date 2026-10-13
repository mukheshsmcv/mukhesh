export type Phase = "OBG" | "Exam Prep" | "First Pass" | "Revision 1" | "Revision 2" | "Revision 3";
export const PHASES: Phase[] = ["OBG", "Exam Prep", "First Pass", "Revision 1", "Revision 2", "Revision 3"];

export interface Row {
  id: string; // ISO date, unique
  date: string; // YYYY-MM-DD
  label: string; // Subject / Day
  subject: string;
  phase: Phase;
  gt: number | null;
  counts: boolean;
  completed: boolean;
  hours: number;
  topic: string;
  attempted: number;
  correct: number;
  score: string;
  notes: string;
}

export const TOTAL_DAYS = 205;
export const TOTAL_GTS = 16;

function addDays(iso: string, n: number): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short", day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC",
  });
}

type Seed = { label: string; subject: string; phase: Phase; gt: number | null };

const FIRST_PASS: ([string, number] | "GT")[] = [
  ["Anatomy", 7], ["Physiology", 5], ["Biochemistry", 3], "GT",
  ["Pathology", 4], ["Pharmacology", 7], ["Microbiology", 6], "GT",
  ["PSM", 6], ["FMT", 3], ["ENT", 2], ["Ophthalmology", 4], "GT",
  ["Medicine", 8], ["Surgery", 8], ["Pediatrics", 6], ["Orthopedics", 3],
  ["Dermatology", 2], ["Psychiatry", 2], ["Radiology", 2], ["Anesthesia", 2], "GT",
];

const REV1: [string, number][] = [
  ["Anatomy", 3], ["Physiology", 2], ["Biochemistry", 2], ["Pathology", 3], ["Pharmacology", 3],
  ["Microbiology", 2], ["PSM", 3], ["FMT", 1], ["ENT", 1], ["Ophthalmology", 2], ["Medicine", 4],
  ["Surgery", 4], ["Pediatrics", 2], ["OBG", 3], ["Orthopedics", 1], ["Dermatology", 1],
  ["Psychiatry", 1], ["Radiology", 1], ["Anesthesia", 1],
];
const REV2: [string, number][] = [
  ["Anatomy", 2], ["Physiology", 1], ["Biochemistry", 1], ["Pathology", 2], ["Pharmacology", 2],
  ["Microbiology", 2], ["PSM", 2], ["FMT", 1], ["ENT", 1], ["Ophthalmology", 1], ["Medicine", 3],
  ["Surgery", 3], ["Pediatrics", 2], ["OBG", 2], ["Orthopedics", 1],
  ["Dermatology + Psychiatry", 1], ["Radiology + Anesthesia", 1],
];
const REV3: [string, number][] = [
  ["Anatomy", 1], ["Physiology", 1], ["Biochemistry", 1], ["Pathology", 1], ["Pharmacology", 1],
  ["Microbiology", 1], ["PSM", 1], ["FMT + ENT", 1], ["Ophthalmology", 1], ["Medicine", 2],
  ["Surgery", 2], ["Pediatrics", 1], ["OBG", 2], ["Orthopedics + Dermatology", 1],
  ["Psychiatry + Radiology + Anesthesia", 1], ["Mixed MCQ Review", 2],
];

function buildSeeds(): Seed[] {
  const s: Seed[] = [];
  let gt = 0;
  for (let i = 1; i <= 8; i++) s.push({ label: `OBG ${i}/8`, subject: "OBG", phase: "OBG", gt: null });
  for (let i = 1; i <= 13; i++)
    s.push({ label: i === 13 ? `Exam Day 13/13` : `Exam Prep ${i}/13`, subject: "Exam Prep", phase: "Exam Prep", gt: null });
  for (const b of FIRST_PASS) {
    if (b === "GT") { gt++; s.push({ label: `GT ${gt}`, subject: "Grand Test", phase: "First Pass", gt }); continue; }
    const [sub, n] = b;
    for (let i = 1; i <= n; i++) s.push({ label: `${sub} ${i}/${n}`, subject: sub, phase: "First Pass", gt: null });
  }
  const rev = (plan: [string, number][], phase: Phase, every: number, total: number) => {
    let c = 0;
    for (const [sub, n] of plan)
      for (let i = 1; i <= n; i++) {
        c++;
        s.push({ label: `${phase} · ${sub}${n > 1 ? ` ${i}/${n}` : ""}`, subject: sub, phase, gt: null });
        if (c % every === 0 && c <= total) { gt++; s.push({ label: `GT ${gt}`, subject: "Grand Test", phase, gt }); }
      }
  };
  rev(REV1, "Revision 1", 10, 40);
  rev(REV2, "Revision 2", 7, 28);
  rev(REV3, "Revision 3", 5, 20);
  return s;
}

export function buildSchedule(): Row[] {
  return buildSeeds().map((seed, i) => {
    const date = addDays("2026-10-12", i);
    return { id: date, date, ...seed, counts: true, completed: false, hours: 0, topic: "", attempted: 0, correct: 0, score: "", notes: "" };
  });
}

export const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
