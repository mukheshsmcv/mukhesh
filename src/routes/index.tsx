import { createFileRoute } from "@tanstack/react-router";
import { memo, useMemo, useRef, useState } from "react";
import { PHASES, TOTAL_DAYS, formatDate, pct, type Row } from "@/lib/schedule";
import { useSchedule } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEET PG 2027 Study Command Center" },
      { name: "description", content: "One consolidated 205-day NEET PG 2027 schedule with progress, MCQ accuracy and GT tracking — stored locally." },
      { property: "og:title", content: "NEET PG 2027 Study Command Center" },
      { property: "og:description", content: "Track 205 study days, 16 grand tests and MCQ accuracy locally in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const f1 = (n: number) => n.toFixed(1);

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;

function Index() {
  const { rows, update, reset, replace } = useSchedule();
  const [tab, setTab] = useState<"schedule" | "progress" | "gts">("schedule");
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState("all");
  const [subject, setSubject] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const scheduled = rows.filter((r) => r.counts);
    const done = scheduled.filter((r) => r.completed).length;
    const attempted = rows.reduce((s, r) => s + r.attempted, 0);
    const correct = rows.reduce((s, r) => s + r.correct, 0);
    const hours = rows.reduce((s, r) => s + r.hours, 0);
    const group = (key: (r: Row) => string) => {
      const m = new Map<string, { total: number; done: number; hours: number; att: number; cor: number }>();
      for (const r of rows) {
        const k = key(r);
        const g = m.get(k) ?? { total: 0, done: 0, hours: 0, att: 0, cor: 0 };
        g.total++; if (r.completed) g.done++; g.hours += r.hours; g.att += r.attempted; g.cor += r.correct;
        m.set(k, g);
      }
      return [...m.entries()];
    };
    const gts = rows.filter((r) => r.gt !== null);
    return { done, attempted, correct, hours, bySubject: group((r) => r.subject).sort((a, b) => a[0].localeCompare(b[0])), byPhase: group((r) => r.phase), gts, gtDone: gts.filter((g) => g.completed).length };
  }, [rows]);

  const subjects = useMemo(() => [...new Set(rows.map((r) => r.subject))].sort(), [rows]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = rows.filter((r) =>
      (phase === "all" || r.phase === phase) &&
      (subject === "all" || r.subject === subject) &&
      (status === "all" || (status === "done" ? r.completed : !r.completed)) &&
      (!s || `${r.label} ${r.topic} ${r.date} ${r.notes}`.toLowerCase().includes(s)));
    return sortAsc ? out : [...out].reverse();
  }, [rows, q, phase, subject, status, sortAsc]);

  const exportJSON = () => download(`neetpg2027-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "neetpg2027", version: 1, rows }, null, 2), "application/json");
  const exportCSV = () => {
    const head = ["Date", "Subject / Day", "Accuracy %", "Completed", "Actual Hours", "Topic", "MCQs Attempted", "MCQs Correct", "Phase", "Counts as Scheduled", "GT Score", "Notes"];
    const lines = rows.map((r) => [r.date, r.label, f1(pct(r.correct, r.attempted)), r.completed ? "Yes" : "No", r.hours, r.topic, r.attempted, r.correct, r.phase, r.counts ? "Yes" : "No", r.score, r.notes].map(csvCell).join(","));
    download("neetpg2027-schedule.csv", [head.map(csvCell).join(","), ...lines].join("\n"), "text/csv");
  };
  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const arr = Array.isArray(data) ? data : data?.rows;
      if (!Array.isArray(arr)) throw new Error();
      replace(arr); setMsg(`Imported ${arr.length} rows.`);
    } catch { setMsg("Import failed: not a valid backup file."); }
  };
  const onReset = () => {
    if (window.confirm("Reset ALL progress? This clears every checkbox, hour, MCQ, topic, score and note. This cannot be undone.\n\nTip: export a JSON backup first.")) {
      reset(); setMsg("All progress reset.");
    }
  };

  const overall = pct(stats.done, TOTAL_DAYS);

  return (
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">NEET PG 2027</p>
          <h1 className="text-2xl font-bold tracking-tight">Study Command Center</h1>
          <p className="text-xs text-muted-foreground">12 Oct 2026 → 4 May 2027 · saved in this browser only</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={exportJSON}>Export JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <button className="btn" onClick={exportCSV}>Export CSV</button>
          <button className="btn text-destructive" onClick={onReset}>Reset</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON backup"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
        </div>
      </header>
      {msg && <p role="status" className="mt-2 text-xs text-warning">{msg}</p>}

      <section className="mt-5 rounded-lg border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Overall progress</span>
          <span className="font-mono text-sm"><b className="text-primary">{stats.done}</b> / {TOTAL_DAYS} · {f1(overall)}%</span>
        </div>
        <div className="mt-2"><Bar value={overall} /></div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total MCQs" value={stats.attempted.toLocaleString()} sub={`${stats.correct.toLocaleString()} correct`} />
        <Stat label="MCQ accuracy" value={`${f1(pct(stats.correct, stats.attempted))}%`} sub={stats.attempted ? "correct / attempted" : "no MCQs yet"} />
        <Stat label="Study hours" value={f1(stats.hours)} sub={`avg ${f1(stats.done ? stats.hours / stats.done : 0)} / done day`} />
        <Stat label="Grand tests" value={`${stats.gtDone} / 16`} sub="completed" />
      </section>

      <nav className="mt-5 flex gap-1 border-b" role="tablist">
        {([["schedule", "Daily schedule"], ["progress", "Progress"], ["gts", "Grand tests"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </nav>

      {tab === "schedule" && (
        <section className="mt-3">
          <div className="flex flex-wrap gap-2">
            <input className="ctl min-w-0 flex-1 sm:max-w-xs" placeholder="Search subject, topic, date…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
            <select className="ctl" value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="Filter by phase">
              <option value="all">All phases</option>{PHASES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select className="ctl" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filter by subject">
              <option value="all">All subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="ctl" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by completion">
              <option value="all">Any status</option><option value="done">Completed</option><option value="todo">Not completed</option>
            </select>
            <span className="self-center font-mono text-xs text-muted-foreground">{visible.length} rows</span>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[960px] text-xs">
              <thead className="sticky top-0 bg-secondary text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"><button onClick={() => setSortAsc((s) => !s)} aria-label="Toggle date sort">Date {sortAsc ? "↑" : "↓"}</button></th>
                  <th className="px-2">Subject / Day</th><th className="px-2">Acc %</th><th className="px-2">Done</th>
                  <th className="px-2">Hours</th><th className="px-2">Topic</th><th className="px-2">MCQ att.</th>
                  <th className="px-2">MCQ cor.</th><th className="px-2">Phase</th><th className="px-2">Sched.</th>
                </tr>
              </thead>
              <tbody>{visible.map((r) => <RowView key={r.id} r={r} update={update} />)}</tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "progress" && (
        <section className="mt-3 grid gap-4 md:grid-cols-2">
          {([["Phase-wise", stats.byPhase], ["Subject-wise", stats.bySubject]] as const).map(([title, list]) => (
            <div key={title} className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">{title} progress</h2>
              <ul className="space-y-2.5">
                {list.map(([k, g]) => (
                  <li key={k}>
                    <div className="flex justify-between text-xs"><span>{k}</span>
                      <span className="font-mono text-muted-foreground">{g.done}/{g.total} · {f1(g.hours)}h · {g.att ? `${f1(pct(g.cor, g.att))}%` : "–"}</span></div>
                    <div className="mt-1"><Bar value={pct(g.done, g.total)} /></div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === "gts" && (
        <section className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.gts.map((g) => (
            <div key={g.id} className={`rounded-lg border p-3 ${g.completed ? "border-primary/60 bg-primary/5" : "bg-card"}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">GT {g.gt}</span>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" className="accent-primary" checked={g.completed} onChange={(e) => update(g.id, { completed: e.target.checked })} />Done
                </label>
              </div>
              <div className="text-[11px] text-muted-foreground">{formatDate(g.date)} · {g.phase}</div>
              <input className="ctl mt-2 w-full" placeholder="Score / rank" value={g.score} onChange={(e) => update(g.id, { score: e.target.value })} aria-label={`GT ${g.gt} score`} />
              <textarea className="ctl mt-1.5 w-full" rows={2} placeholder="Notes" value={g.notes} onChange={(e) => update(g.id, { notes: e.target.value })} aria-label={`GT ${g.gt} notes`} />
            </div>
          ))}
        </section>
      )}

      <footer className="mt-8 text-center text-[11px] text-muted-foreground">Data lives only in this browser's local storage. Export a backup regularly.</footer>
    </main>
  );
}

const RowView = memo(function RowView({ r, update }: { r: Row; update: (id: string, p: Partial<Row>) => void }) {
  const n = (v: string) => Math.max(0, Number(v) || 0);
  const acc = r.attempted ? `${f1(pct(r.correct, r.attempted))}` : "–";
  return (
    <tr className={`border-t ${r.completed ? "bg-primary/5" : ""} ${r.gt ? "text-warning" : ""}`}>
      <td className="whitespace-nowrap px-2 py-1 font-mono text-muted-foreground">{formatDate(r.date)}</td>
      <td className="whitespace-nowrap px-2 font-medium">{r.label}</td>
      <td className="px-2 font-mono">{acc}</td>
      <td className="px-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={r.completed} onChange={(e) => update(r.id, { completed: e.target.checked })} aria-label={`Completed ${r.label} ${r.date}`} /></td>
      <td className="w-16 px-1"><input type="number" min={0} max={24} step={0.5} className="cell-input" value={r.hours || ""} placeholder="0" onChange={(e) => update(r.id, { hours: Math.min(24, n(e.target.value)) })} aria-label="Actual hours" /></td>
      <td className="min-w-48 px-1"><input className="cell-input" value={r.topic} placeholder="—" onChange={(e) => update(r.id, { topic: e.target.value })} aria-label="Topic" /></td>
      <td className="w-20 px-1"><input type="number" min={0} className="cell-input" value={r.attempted || ""} placeholder="0"
        onChange={(e) => { const a = n(e.target.value); update(r.id, { attempted: a, correct: Math.min(r.correct, a) }); }} aria-label="MCQs attempted" /></td>
      <td className="w-20 px-1"><input type="number" min={0} max={r.attempted} className="cell-input" value={r.correct || ""} placeholder="0"
        onChange={(e) => update(r.id, { correct: Math.min(n(e.target.value), r.attempted) })} aria-label="MCQs correct" /></td>
      <td className="whitespace-nowrap px-2 text-muted-foreground">{r.phase}</td>
      <td className="px-2 text-muted-foreground">{r.counts ? "Yes" : "No"}</td>
    </tr>
  );
});
