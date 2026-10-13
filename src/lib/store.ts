import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { buildSchedule, type Row } from "./schedule";

/** Guest (signed-out) storage key — unchanged from the local-only version. */
const KEY = "neetpg2027.schedule.v1";
const cacheKey = (uid: string) => `${KEY}.cloud.${uid}`;
const pendingKey = (uid: string) => `${KEY}.pending.${uid}`;
const migratedKey = (uid: string) => `${KEY}.migrated.${uid}`;

const EDITABLE = ["completed", "hours", "topic", "attempted", "correct", "score", "notes"] as const;

export type SyncStatus = "local" | "loading" | "synced" | "saving" | "offline" | "error";
export interface MigrationPrompt { localDone: number; localTouched: number; cloudDone: number; cloudTouched: number; local: Row[]; cloud: Row[] }

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Merge user-editable fields from saved/imported data onto the canonical schedule. */
export function mergeSaved(saved: unknown): Row[] {
  const base = buildSchedule();
  if (!Array.isArray(saved)) return base;
  const byId = new Map<string, Record<string, unknown>>();
  for (const r of saved) {
    if (!r || typeof r !== "object") continue;
    const id = (r as Record<string, unknown>)["id"] ?? (r as Record<string, unknown>)["day_id"];
    if (typeof id === "string") byId.set(id, r as Record<string, unknown>);
  }
  return base.map((row) => {
    const s = byId.get(row.id) as Partial<Record<keyof Row, unknown>> | undefined;
    if (!s) return row;
    const attempted = Math.floor(num(s.attempted));
    return {
      ...row,
      completed: s.completed === true,
      hours: Math.min(24, num(s.hours)),
      attempted,
      correct: Math.min(Math.floor(num(s.correct)), attempted),
      topic: typeof s.topic === "string" ? s.topic : "",
      score: typeof s.score === "string" ? s.score : "",
      notes: typeof s.notes === "string" ? s.notes : "",
    };
  });
}

export const isTouched = (r: Row) => r.completed || r.hours > 0 || r.attempted > 0 || r.correct > 0 || !!r.topic || !!r.score || !!r.notes;
const slim = (rows: Row[]) => rows.map((r) => ({ id: r.id, ...Object.fromEntries(EDITABLE.map((k) => [k, r[k]])) }));
const toDb = (r: Row, user_id: string) => ({ user_id, day_id: r.id, completed: r.completed, hours: r.hours, topic: r.topic, attempted: r.attempted, correct: r.correct, score: r.score, notes: r.notes });

function readJSON(key: string): unknown {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
const readPending = (uid: string) => new Set<string>((readJSON(pendingKey(uid)) as string[] | null) ?? []);

/** Fill only cloud rows that have no data with local data. */
export function mergeLocalIntoCloud(cloud: Row[], local: Row[]): Row[] {
  return cloud.map((c, i) => (!isTouched(c) && local[i] && isTouched(local[i]!) ? { ...c, ...Object.fromEntries(EDITABLE.map((k) => [k, local[i]![k]])) } as Row : c));
}

export function useSchedule() {
  const [rows, setRows] = useState<Row[]>(() => buildSchedule());
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("local");
  const [migration, setMigration] = useState<MigrationPrompt | null>(null);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const userRef = useRef<User | null>(null);
  const pending = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);

  // --- auth session ---
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      if (u?.id !== userRef.current?.id) setUser(u);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const persistPending = (uid: string) => localStorage.setItem(pendingKey(uid), JSON.stringify([...pending.current]));

  const flush = useCallback(async () => {
    const u = userRef.current;
    if (!u || flushing.current || pending.current.size === 0) return;
    flushing.current = true;
    const ids = [...pending.current];
    const byId = new Map(rowsRef.current.map((r) => [r.id, r]));
    const payload = ids.map((id) => byId.get(id)).filter(Boolean).map((r) => toDb(r!, u.id));
    setStatus("saving");
    const { error } = await supabase.from("study_progress").upsert(payload, { onConflict: "user_id,day_id" });
    flushing.current = false;
    if (userRef.current?.id !== u.id) return;
    if (error) {
      setStatus(navigator.onLine ? "error" : "offline");
      return;
    }
    // Only clear ids whose values didn't change during the request
    const now = new Map(rowsRef.current.map((r) => [r.id, r]));
    for (const p of payload) {
      const cur = now.get(p.day_id);
      if (cur && JSON.stringify(toDb(cur, u.id)) === JSON.stringify(p)) pending.current.delete(p.day_id);
    }
    persistPending(u.id);
    if (pending.current.size) void flush(); else setStatus("synced");
  }, []);

  const scheduleFlush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 600);
  }, [flush]);

  const markPending = useCallback((ids: string[]) => {
    const u = userRef.current;
    if (!u) return;
    ids.forEach((id) => pending.current.add(id));
    persistPending(u.id);
    scheduleFlush();
  }, [scheduleFlush]);

  // --- load data whenever the signed-in user changes ---
  useEffect(() => {
    if (!authReady) return;
    userRef.current = user;
    let cancelled = false;

    if (!user) {
      pending.current = new Set();
      const saved = readJSON(KEY);
      setRows(saved ? mergeSaved(saved) : buildSchedule());
      setStatus("local");
      setMigration(null);
      setLoaded(true);
      return;
    }

    const uid = user.id;
    pending.current = readPending(uid);
    const cached = readJSON(cacheKey(uid));
    if (cached) setRows(mergeSaved(cached));
    setLoaded(true);
    setStatus("loading");

    (async () => {
      const { data, error } = await supabase.from("study_progress").select("*");
      if (cancelled) return;
      if (error) { setStatus(navigator.onLine ? "error" : "offline"); return; }
      let cloud = mergeSaved(data);
      // Unsynced local edits (from cache) win over the server copy for those days.
      if (pending.current.size && cached) {
        const c = new Map(mergeSaved(cached).map((r) => [r.id, r]));
        cloud = cloud.map((r) => (pending.current.has(r.id) ? c.get(r.id) ?? r : r));
      }
      const guest = mergeSaved(readJSON(KEY));
      const guestTouched = guest.filter(isTouched).length;
      if (guestTouched > 0 && !localStorage.getItem(migratedKey(uid))) {
        setMigration({
          localDone: guest.filter((r) => r.completed).length, localTouched: guestTouched,
          cloudDone: cloud.filter((r) => r.completed).length, cloudTouched: cloud.filter(isTouched).length,
          local: guest, cloud,
        });
      }
      setRows(cloud);
      if (pending.current.size) void flush(); else setStatus("synced");
    })();

    // Realtime: apply changes made on other devices
    const channel = supabase
      .channel(`progress-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_progress", filter: `user_id=eq.${uid}` }, (payload) => {
        const rec = (payload.eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
        const id = rec?.["day_id"] as string | undefined;
        if (!id || pending.current.has(id)) return;
        if (payload.eventType === "DELETE") {
          const fresh = buildSchedule().find((r) => r.id === id);
          if (fresh) setRows((rs) => rs.map((r) => (r.id === id ? fresh : r)));
          return;
        }
        const [merged] = mergeSaved([rec]).filter((r) => r.id === id);
        if (merged) setRows((rs) => rs.map((r) => (r.id === id ? merged : r)));
      })
      .subscribe();

    const retry = () => void flush();
    window.addEventListener("online", retry);
    const iv = setInterval(retry, 15000);
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener("online", retry);
      clearInterval(iv);
    };
  }, [user, authReady, flush]);

  // --- local cache / guest storage ---
  useEffect(() => {
    if (!loaded || !authReady) return;
    const key = userRef.current ? cacheKey(userRef.current.id) : KEY;
    localStorage.setItem(key, JSON.stringify(slim(rows)));
  }, [rows, loaded, authReady]);

  const update = useCallback((id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    markPending([id]);
  }, [markPending]);

  const reset = useCallback(async () => {
    const u = userRef.current;
    setRows(buildSchedule());
    if (!u) return;
    pending.current = new Set(); persistPending(u.id);
    setStatus("saving");
    const { error } = await supabase.from("study_progress").delete().eq("user_id", u.id);
    setStatus(error ? "error" : "synced");
  }, []);

  const replace = useCallback((data: unknown) => {
    const next = mergeSaved(data);
    setRows(next);
    rowsRef.current = next;
    markPending(next.map((r) => r.id));
  }, [markPending]);

  const resolveMigration = useCallback((choice: "cloud" | "merge" | "local") => {
    const u = userRef.current;
    if (!u || !migration) return;
    if (choice !== "cloud") {
      const next = choice === "merge" ? mergeLocalIntoCloud(migration.cloud, migration.local) : migration.local;
      setRows(next);
      rowsRef.current = next;
      markPending(next.filter((r, i) => JSON.stringify(r) !== JSON.stringify(migration.cloud[i])).map((r) => r.id));
    }
    localStorage.setItem(migratedKey(u.id), choice);
    setMigration(null);
  }, [migration, markPending]);

  return { rows, loaded, update, reset, replace, user, authReady, status, migration, resolveMigration, retry: flush };
}
