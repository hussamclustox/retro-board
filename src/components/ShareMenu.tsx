"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { downloadBoardPdf } from "@/lib/exportPdf";
import { useToast } from "./Toast";
import { CopyIcon, DownloadIcon, ShareIcon } from "./Icons";

interface Props {
  boardId: string;
  boardName: string;
  isHost: boolean;
  target: React.RefObject<HTMLElement | null>;
}

export function ShareMenu({ boardId, boardName, isHost, target }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [link, setLink] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setLink(`${base.replace(/\/$/, "")}/board/${boardId}`);
  }, [boardId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => panel.current && !panel.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied", "success");
    } catch {
      toast("Could not copy — select the link and copy it manually", "error");
    }
  };

  const exportPdf = async () => {
    if (!target.current) return;
    setExporting(true);
    try {
      const data = await api(`/boards/${boardId}/export`, { boardId });
      await downloadBoardPdf(target.current, boardName, data);
      toast("PDF downloaded", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not export PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
      >
        <ShareIcon />
        <span className="hidden sm:inline">{exporting ? "Exporting…" : "Share"}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl">
          <label className="text-sm font-medium" htmlFor="share-link">
            Invite link
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Anyone with this link can enter their name and join.</p>
          <div className="mt-2 flex gap-2">
            <input
              id="share-link"
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
            />
            <button
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <CopyIcon /> Copy
            </button>
          </div>

          {isHost && (
            <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-sm font-medium">Export PDF</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A screenshot of the board plus its data as JSON. Anonymous authors stay anonymous.
              </p>
              <button
                onClick={exportPdf}
                disabled={exporting}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                <DownloadIcon /> {exporting ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
