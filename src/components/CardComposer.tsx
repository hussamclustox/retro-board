"use client";
import { useState } from "react";
import { PlusIcon } from "./Icons";
import { SubmitTextarea } from "./SubmitTextarea";

/** Draft text stays in this component until Enter — nobody else sees it while typing. */
export function CardComposer({ onAdd, anonymous }: { onAdd: (text: string) => void; anonymous: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!open) {
    return (
      <button
        data-screenshot-ignore
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-900/70 hover:text-slate-800 dark:hover:text-slate-100"
      >
        <PlusIcon /> Add a point
      </button>
    );
  }

  return (
    <div data-screenshot-ignore className="rounded-lg bg-white dark:bg-slate-900 p-2 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
      <SubmitTextarea
        autoFocus
        value={text}
        onChange={setText}
        onSubmit={(value) => {
          onAdd(value);
          setText("");
        }}
        onCancel={() => {
          setOpen(false);
          setText("");
        }}
        placeholder="What's on your mind?"
        maxLength={1000}
        className="border-0 px-1 focus:ring-0"
      />
      <div className="mt-1 flex items-center justify-between px-1 text-xs text-slate-400 dark:text-slate-500">
        <span>
          Enter to post · Shift+Enter for new line{anonymous && <span className="text-violet-600 dark:text-violet-400"> · posting anonymously</span>}
        </span>
        <button
          onClick={() => {
            setOpen(false);
            setText("");
          }}
          className="rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
