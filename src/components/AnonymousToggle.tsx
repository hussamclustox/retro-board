"use client";
import { MaskIcon } from "./Icons";

/** Applies to all of this user's points and comments on the board, past and future. */
export function AnonymousToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      title={
        on
          ? "Your points and comments show as Anonymous to everyone, including the host"
          : "Hide your name on all your points and comments from everyone, including the host"
      }
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${
        on ? "border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      <MaskIcon />
      <span className="hidden sm:inline">Anonymous</span>
      <span className={`relative h-4 w-7 rounded-full transition-colors ${on ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-600"}`}>
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white dark:bg-slate-900 shadow transition-all ${on ? "left-3.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
