"use client";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardView, HiddenCardView } from "@/lib/types";
import type { BoardActions } from "@/lib/useBoard";
import { AuthorLabel } from "./AuthorLabel";
import { Comments } from "./Comments";
import { CommentIcon, EyeIcon, PencilIcon, ThumbIcon, TrashIcon } from "./Icons";
import { SubmitTextarea } from "./SubmitTextarea";

/** Keeps buttons and inputs inside a card from starting a drag (mouse, touch and keyboard sensors). */
const stopDrag = {
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
};

interface Props {
  card: CardView;
  actions: BoardActions;
  canWrite: boolean;
}

export function SortableCard({ card, actions, canWrite }: Props) {
  const [editing, setEditing] = useState(false);
  const pending = card.id.startsWith("tmp-");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !canWrite || editing || pending,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
      {...attributes}
      {...listeners}
    >
      <CardBody card={card} actions={actions} canWrite={canWrite} editing={editing} setEditing={setEditing} />
    </div>
  );
}

export function CardBody({
  card,
  actions,
  canWrite,
  editing = false,
  setEditing,
  overlay,
}: Props & { editing?: boolean; setEditing?: (v: boolean) => void; overlay?: boolean }) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState(card.text);
  const pending = card.id.startsWith("tmp-");

  return (
    <article
      className={`group rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/80 dark:ring-white/10 ${
        canWrite && !editing ? "cursor-grab active:cursor-grabbing" : ""
      } ${overlay ? "rotate-1 shadow-lg ring-indigo-300 dark:ring-indigo-500" : "hover:ring-slate-300 dark:hover:ring-slate-700"} ${pending ? "opacity-70" : ""}`}
    >
      {editing ? (
        <SubmitTextarea
          autoFocus
          value={draft}
          onChange={setDraft}
          onSubmit={(text) => {
            actions.editCard(card.id, text);
            setEditing?.(false);
          }}
          onCancel={() => {
            setDraft(card.text);
            setEditing?.(false);
          }}
          maxLength={1000}
        />
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{card.text}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="min-w-0 flex-1">
          <AuthorLabel author={card.author} isMine={card.isMine} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5" {...stopDrag}>
          {card.canEdit && canWrite && !editing && !pending && (
            <span className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
              <button
                aria-label="Edit point"
                onClick={() => {
                  setDraft(card.text);
                  setEditing?.(true);
                }}
                className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                aria-label="Delete point"
                onClick={() => confirm("Delete this point?") && actions.deleteCard(card.id)}
                className="rounded p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          <button
            aria-label={card.likedByMe ? "Unlike" : "Like"}
            aria-pressed={card.likedByMe}
            disabled={!canWrite || pending}
            onClick={() => actions.toggleLike(card.id)}
            className={`flex items-center gap-1 rounded px-1.5 py-1 disabled:cursor-not-allowed ${
              card.likedByMe ? "text-indigo-600 dark:text-indigo-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
            }`}
          >
            <ThumbIcon className="h-3.5 w-3.5" filled={card.likedByMe} />
            {card.likeCount > 0 && card.likeCount}
          </button>
          <button
            aria-label="Comments"
            aria-expanded={showComments}
            disabled={pending}
            onClick={() => setShowComments((s) => !s)}
            className={`flex items-center gap-1 rounded px-1.5 py-1 ${
              showComments ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100" : "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
            }`}
          >
            <CommentIcon className="h-3.5 w-3.5" />
            {card.comments.length > 0 && card.comments.length}
          </button>
        </div>
      </div>

      {showComments && !overlay && (
        <div {...stopDrag} onKeyDown={(e) => e.stopPropagation()}>
          <Comments card={card} actions={actions} canWrite={canWrite} />
        </div>
      )}
    </article>
  );
}

// Skeleton bar widths come from the card id, never the text, so the shape gives nothing away.
const FIRST_LINE = ["w-full", "w-11/12", "w-5/6", "w-4/5"];
const SECOND_LINE = ["w-2/3", "w-3/5", "w-1/2", "w-2/5"];
const hash = (id: string) => [...id].reduce((n, ch) => (Math.imul(n, 31) + ch.charCodeAt(0)) >>> 0, 7);

/** Someone else's card while points are hidden: it keeps its place and author, but the server never sent its content. */
export function HiddenCard({ card: { id, author } }: { card: HiddenCardView }) {
  // Sortable (but never draggable) so cards dropped around it get the right position.
  const { setNodeRef, transform, transition } = useSortable({ id, disabled: true });
  const bar = "h-2.5 rounded-full bg-slate-200 dark:bg-slate-700";

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <article
        aria-label="Hidden point"
        title="Hidden until the host reveals points"
        className="rounded-lg bg-white/70 p-3 ring-1 ring-slate-200/80 dark:bg-slate-900/60 dark:ring-white/10"
      >
        <div className="space-y-2 py-0.5">
          <div className={`${bar} ${FIRST_LINE[hash(id) % FIRST_LINE.length]}`} />
          <div className={`${bar} ${SECOND_LINE[(hash(id) >>> 3) % SECOND_LINE.length]}`} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="min-w-0 flex-1">
            <AuthorLabel author={author} isMine={false} />
          </div>
          <EyeIcon off className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
        </div>
      </article>
    </div>
  );
}
