"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { forgetBoard, getHostedBoards, getHostName, saveHostedBoard, saveHostName, saveIdentity } from "@/lib/storage";
import type { BoardSummary, Identity } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { LockIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Dashboard() {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const ids = Object.keys(getHostedBoards());
    if (!ids.length) return setBoards([]);
    try {
      const data = await api<{ boards: BoardSummary[] }>(`/boards?ids=${ids.join(",")}`);
      setBoards(data.boards.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      setBoards([]);
      toast(err instanceof Error ? err.message : "Could not load boards", "error");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (board: BoardSummary) => {
    if (!confirm(`Delete "${board.name}" for everyone? This cannot be undone.`)) return;
    try {
      await api(`/boards/${board.id}`, { method: "DELETE", boardId: board.id });
      forgetBoard(board.id);
      setBoards((b) => b?.filter((x) => x.id !== board.id) ?? null);
      toast("Board deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not delete board", "error");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retro boards</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Boards you host from this browser.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
          >
            <PlusIcon /> New board
          </button>
        </div>
      </header>

      {boards === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/60 dark:bg-slate-800/70" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <h2 className="font-medium">No boards yet</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a board and share the link with your team.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <PlusIcon /> Create your first board
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <li key={b.id} className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow">
              <Link href={`/board/${b.id}`} className="block p-5">
                <div className="flex items-start gap-2 pr-8">
                  <h2 className="line-clamp-2 font-medium">{b.name}</h2>
                  {b.locked && <LockIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(b.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </p>
                <div className="mt-4 flex gap-4 text-sm text-slate-600 dark:text-slate-300">
                  <span>{b.cardCount} {b.cardCount === 1 ? "point" : "points"}</span>
                  <span>{b.participantCount} {b.participantCount === 1 ? "person" : "people"}</span>
                </div>
              </Link>
              <button
                onClick={() => remove(b)}
                aria-label={`Delete ${b.name}`}
                className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 dark:text-slate-500 opacity-0 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && <NewBoardModal onClose={() => setCreating(false)} />}
    </main>
  );
}

function NewBoardModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState(() => (typeof window === "undefined" ? "" : getHostName()));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hostName.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ boardId: string; hostToken: string; identity: Identity }>("/boards", {
        method: "POST",
        body: { name, hostName },
      });
      saveHostName(hostName.trim());
      saveHostedBoard(res.boardId, res.hostToken);
      saveIdentity(res.boardId, res.identity);
      router.push(`/board/${res.boardId}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create board", "error");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 p-4" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">New board</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Starts with <b>Went Well</b>, <b>To Improve</b> and <b>Action Items</b>.
        </p>
        <label className="mt-5 block text-sm font-medium">
          Board name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Sprint 42 retro"
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Your name
          <input
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            maxLength={60}
            placeholder="Shown on points you add"
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button
            disabled={busy || !name.trim() || !hostName.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create board"}
          </button>
        </div>
      </form>
    </div>
  );
}
