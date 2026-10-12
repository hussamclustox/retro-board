"use client";
import { useState } from "react";

export function JoinForm({ boardName, onJoin }: { boardName: string; onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onJoin(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">You&apos;re invited to a retro</p>
        <h1 className="mt-1 text-xl font-semibold">{boardName}</h1>
        <label className="mt-5 block text-sm font-medium">
          Your name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Alex"
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          You can switch on <b>Anonymous</b> inside the board to hide your name from everyone, including the host.
        </p>
        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <button
          disabled={busy || !name.trim()}
          className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join board"}
        </button>
      </form>
    </main>
  );
}
