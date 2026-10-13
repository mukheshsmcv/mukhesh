import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { MigrationPrompt, SyncStatus } from "@/lib/store";

const STATUS: Record<SyncStatus, string> = {
  local: "Saved on this device only",
  loading: "Loading from cloud…",
  synced: "Synced to cloud",
  saving: "Saving…",
  offline: "Offline — changes saved locally, will sync",
  error: "Sync error — changes kept locally, retrying",
};

export function SyncBadge({ user, status, onRetry }: { user: User | null; status: SyncStatus; onRetry: () => void }) {
  const tone = status === "synced" ? "bg-primary" : status === "error" || status === "offline" ? "bg-warning" : "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground" role="status" aria-live="polite">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} aria-hidden />
      {user ? STATUS[status] : STATUS.local}
      {user && (status === "error" || status === "offline") && <button className="underline" onClick={onRetry}>Retry</button>}
    </span>
  );
}

export function AccountPanel({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="max-w-48 truncate text-muted-foreground" title={user.email}>{user.email}</span>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    const redirect = window.location.origin;
    const res =
      mode === "signin" ? await supabase.auth.signInWithPassword({ email, password }) :
      mode === "signup" ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } }) :
      await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (res.error) { setMsg(res.error.message); return; }
    if (mode === "signup" && !res.data.session) setMsg("Check your email to confirm your account, then sign in.");
    else if (mode === "magic") setMsg("Check your email for a sign-in link.");
    else setOpen(false);
  };

  return (
    <div className="relative">
      <button className="btn border-primary text-primary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>Sign in to sync</button>
      {open && (
        <form onSubmit={submit} className="absolute right-0 z-20 mt-2 w-72 space-y-2 rounded-lg border bg-popover p-3 shadow-xl">
          <div className="flex gap-1 text-[11px]" role="tablist">
            {([["signin", "Sign in"], ["signup", "Create account"], ["magic", "Email link"]] as const).map(([k, l]) => (
              <button type="button" key={k} role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setMsg(""); }}
                className={`rounded px-2 py-1 ${mode === k ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
          <input className="ctl w-full" type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          {mode !== "magic" && (
            <input className="ctl w-full" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
          )}
          <button className="btn w-full justify-center border-primary text-primary" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send link"}
          </button>
          {msg && <p className="text-[11px] text-warning" role="alert">{msg}</p>}
          <p className="text-[10px] text-muted-foreground">Your progress syncs privately to your account across devices.</p>
        </form>
      )}
    </div>
  );
}

export function MigrationDialog({ m, onChoose }: { m: MigrationPrompt; onChoose: (c: "cloud" | "merge" | "local") => void }) {
  const confirmReplace = () => {
    if (window.confirm("Replace ALL cloud progress with this device's data? Cloud entries not on this device will be cleared.")) onChoose("local");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" role="dialog" aria-modal="true" aria-labelledby="mig-title">
      <div className="w-full max-w-md rounded-lg border bg-card p-5">
        <h2 id="mig-title" className="text-lg font-semibold">Progress found on this device</h2>
        <p className="mt-1 text-xs text-muted-foreground">Choose how to combine it with your cloud account. Nothing changes until you pick.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="rounded border p-2"><div className="text-muted-foreground">This device</div>{m.localDone} done · {m.localTouched} edited days</div>
          <div className="rounded border p-2"><div className="text-muted-foreground">Cloud</div>{m.cloudDone} done · {m.cloudTouched} edited days</div>
        </div>
        <div className="mt-4 space-y-2">
          <button className="btn w-full justify-center border-primary text-primary" onClick={() => onChoose("merge")}>Merge — add device data only to empty cloud days</button>
          <button className="btn w-full justify-center" onClick={() => onChoose("cloud")}>Keep cloud — ignore this device's data</button>
          <button className="btn w-full justify-center text-destructive" onClick={confirmReplace}>Replace cloud with this device's data</button>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">Your device data stays saved locally either way. Export a JSON backup first if unsure.</p>
      </div>
    </div>
  );
}
