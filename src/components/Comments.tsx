"use client";
import { useState } from "react";
import type { CardView } from "@/lib/types";
import type { BoardActions } from "@/lib/useBoard";
import { AuthorLabel } from "./AuthorLabel";
import { PencilIcon, ThumbIcon, TrashIcon } from "./Icons";
import { SubmitTextarea } from "./SubmitTextarea";

export function Comments({ card, actions, canWrite }: { card: CardView; actions: BoardActions; canWrite: boolean }) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
      {card.comments.map((cm) => (
        <div key={cm.id} className="group/comment rounded-md bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 text-sm">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <AuthorLabel author={cm.author} isMine={cm.isMine} />
            <span className="flex shrink-0 items-center gap-0.5">
              {cm.canEdit && canWrite && editing !== cm.id && !cm.id.startsWith("tmp-") && (
                <span className="flex shrink-0 gap-0.5 opacity-0 group-hover/comment:opacity-100 focus-within:opacity-100">
                  <button
                    aria-label="Edit comment"
                    onClick={() => {
                      setEditing(cm.id);
                      setEditText(cm.text);
                    }}
                    className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                  <button
                    aria-label="Delete comment"
                    onClick={() => actions.deleteComment(card.id, cm.id)}
                    className="rounded p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                aria-label={cm.likedByMe ? "Unlike comment" : "Like comment"}
                aria-pressed={cm.likedByMe}
                disabled={!canWrite || cm.id.startsWith("tmp-")}
                onClick={() => actions.toggleCommentLike(card.id, cm.id)}
                className={`flex items-center gap-1 rounded px-1 py-0.5 disabled:cursor-not-allowed ${
                  cm.likedByMe ? "text-indigo-600 dark:text-indigo-400" : "hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <ThumbIcon className="h-3 w-3" filled={cm.likedByMe} />
                {cm.likeCount > 0 && cm.likeCount}
              </button>
            </span>
          </div>
          {editing === cm.id ? (
            <SubmitTextarea
              autoFocus
              value={editText}
              onChange={setEditText}
              onSubmit={(text) => {
                actions.editComment(card.id, cm.id, text);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
              onBlur={() => setEditing(null)}
              className="mt-1"
            />
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap break-words">{cm.text}</p>
          )}
        </div>
      ))}
      {canWrite && (
        <SubmitTextarea
          value={draft}
          onChange={setDraft}
          onSubmit={(text) => {
            actions.addComment(card.id, text);
            setDraft("");
          }}
          placeholder="Write a comment… (Enter to post)"
          maxLength={1000}
        />
      )}
    </div>
  );
}
