"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useBoard } from "@/lib/useBoard";
import { Board } from "@/components/Board";
import { AnonymousToggle } from "@/components/AnonymousToggle";
import { PresenceBar } from "@/components/PresenceBar";
import { ShareMenu } from "@/components/ShareMenu";
import { JoinForm } from "@/components/JoinForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { BackIcon, EyeIcon, LockIcon } from "@/components/Icons";

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { status, board, boardName, error, clearError, online, connected, actions } = useBoard(id);
  const boardRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (error && status === "ready") {
      toast(error, "error");
      clearError();
    }
  }, [error, status, toast, clearError]);

  useEffect(() => {
    if (boardName) document.title = `${boardName} · Retro Board`;
  }, [boardName]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading board…</div>;
  }
  if (status === "missing") {
    return (
      <Centered title="Board not found" body="It may have been deleted, or the link is wrong.">
        <Link href="/" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
          Go to dashboard
        </Link>
      </Centered>
    );
  }
  if (status === "error" || (status === "ready" && !board)) {
    return <Centered title="Couldn't load the board" body={error ?? "Please try again."} />;
  }
  if (status === "join") return <JoinForm boardName={boardName} onJoin={actions.join} />;
  if (!board) return null;

  const isHost = board.role === "host";
  const canWrite = isHost || !board.locked;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-sage-200 dark:border-slate-800 bg-sage-50/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-8xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          {isHost && (
            <Link href="/" aria-label="Back to dashboard" className="rounded-md p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <BackIcon />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{board.name}</h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {isHost ? "You are the host" : `Joined as ${board.me.name}`}
              {board.me.anonymous && <span className="text-violet-600 dark:text-violet-400"> · You are anonymous on this board</span>}
            </p>
          </div>

          <PresenceBar users={online} connected={connected} />

          {isHost && (
            <>
              <button
                onClick={() => actions.setBoardFlags({ revealed: !board.revealed })}
                title={board.revealed ? "Hide everyone's points from each other" : "Show all points to everyone"}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  board.revealed
                    ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                }`}
              >
                <EyeIcon off={board.revealed} />
                <span className="hidden sm:inline">{board.revealed ? "Hide points" : "Reveal points"}</span>
              </button>
              <button
                onClick={() => actions.setBoardFlags({ locked: !board.locked })}
                title={board.locked ? "Allow participants to edit again" : "Make the board read-only for participants"}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  board.locked
                    ? "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <LockIcon open={board.locked} />
                <span className="hidden sm:inline">{board.locked ? "Unlock" : "Lock"}</span>
              </button>
            </>
          )}

          <AnonymousToggle on={board.me.anonymous} onChange={actions.setAnonymous} />
          <ThemeToggle />
          <ShareMenu boardId={board.id} boardName={board.name} isHost={isHost} target={boardRef} />
        </div>
      </header>

      <main className="mx-auto max-w-8xl px-4 py-6 sm:px-6">
        {!board.revealed && (
          <Banner tone="amber">
            {isHost
              ? "Points are hidden: each participant sees only their own. Click “Reveal points” when everyone is done."
              : "Points are hidden until the host reveals them. You can only see your own for now."}
          </Banner>
        )}
        {board.locked && (
          <Banner tone="rose">
            {isHost
              ? "Board is locked. Participants can view it but can't add, like, comment or move points."
              : "The host locked this board. It's read-only now."}
          </Banner>
        )}

        <div ref={boardRef} className="rounded-xl">
          <Board board={board} actions={actions} canWrite={canWrite} />
        </div>
      </main>
    </div>
  );
}

function Banner({ tone, children }: { tone: "amber" | "rose"; children: React.ReactNode }) {
  const styles = tone === "amber" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-amber-200 dark:ring-amber-900" : "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-rose-200 dark:ring-rose-900";
  return <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm ring-1 ${styles}`}>{children}</div>;
}

function Centered({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
      {children}
    </main>
  );
}
