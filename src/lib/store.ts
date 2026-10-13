import { useCallback, useEffect, useState } from "react";
import { buildSchedule, type Row } from "./schedule";

const KEY = "neetpg2027.schedule.v1";
const EDITABLE: (keyof Row)[] = ["completed", "hours", "topic", "attempted", "correct", "score", "notes"];

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Merge user-editable fields from saved/imported data onto the canonical schedule. */
export function mergeSaved(saved: unknown): Row[] {
  const base = buildSchedule();
  if (!Array.isArray(saved)) return base;
  const byId = new Map<string, Record<string, unknown>>();
  for (const r of saved) if (r && typeof r === "object" && typeof (r as Row).id === "string") byId.set((r as Row).id, r as Record<string, unknown>);
  return base.map((row) => {
    const s = byId.get(row.id);
    if (!s) return row;
    const correct = num(s.correct), attempted = num(s.attempted);
    return {
      ...row,
      completed: s.completed === true,
      hours: num(s.hours),
      attempted,
      correct: Math.min(correct, attempted),
      topic: typeof s.topic === "string" ? s.topic : "",
      score: typeof s.score === "string" ? s.score : "",
      notes: typeof s.notes === "string" ? s.notes : "",
    };
  });
}

export function useSchedule() {
  const [rows, setRows] = useState<Row[]>(() => buildSchedule());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRows(mergeSaved(JSON.parse(raw)));
    } catch { /* ignore corrupt storage */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const slim = rows.map((r) => Object.fromEntries([["id", r.id], ...EDITABLE.map((k) => [k, r[k]])]));
    localStorage.setItem(KEY, JSON.stringify(slim));
  }, [rows, loaded]);

  const update = useCallback((id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const reset = useCallback(() => setRows(buildSchedule()), []);
  const replace = useCallback((data: unknown) => setRows(mergeSaved(data)), []);

  return { rows, loaded, update, reset, replace };
}
