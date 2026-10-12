"use client";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CardView, ColumnView, HiddenCardView } from "@/lib/types";
import type { BoardActions } from "@/lib/useBoard";
import { HiddenCard, SortableCard } from "./Card";
import { CardComposer } from "./CardComposer";

// Full class strings so Tailwind can see them.
// Light: neutral translucent panels with a colored top bar so white cards stand out.
// Dark: each column gets its own tint so they're easy to tell apart.
const palette: Record<string, { panel: string; idleRing: string; title: string; dot: string; ring: string }> = {
  emerald: {
    panel: "border-emerald-500 dark:bg-emerald-950/60",
    idleRing: "ring-1 ring-sage-300/60 dark:ring-emerald-900/70",
    title: "dark:text-emerald-200",
    dot: "bg-emerald-500",
    ring: "ring-emerald-400",
  },
  amber: {
    panel: "border-amber-500 dark:bg-amber-950/50",
    idleRing: "ring-1 ring-sage-300/60 dark:ring-amber-900/70",
    title: "dark:text-amber-200",
    dot: "bg-amber-500",
    ring: "ring-amber-400",
  },
  sky: {
    panel: "border-sky-500 dark:bg-sky-950/60",
    idleRing: "ring-1 ring-sage-300/60 dark:ring-sky-900/70",
    title: "dark:text-sky-200",
    dot: "bg-sky-500",
    ring: "ring-sky-400",
  },
};

interface Props {
  column: ColumnView;
  /** Card ids in display order; ids in `hiddenById` render as placeholders. */
  ids: string[];
  cardsById: Map<string, CardView>;
  hiddenById: Map<string, HiddenCardView>;
  actions: BoardActions;
  canWrite: boolean;
  anonymous: boolean;
}

export function Column({ column, ids, cardsById, hiddenById, actions, canWrite, anonymous }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const colors = palette[column.color] ?? palette.sky;

  return (
    <section
      className={`flex flex-col rounded-xl border-t-4 bg-white/45 p-3 ${colors.panel} ${
        isOver ? `ring-2 ${colors.ring}` : colors.idleRing
      }`}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
        <h2 className={`font-semibold ${colors.title}`}>{column.title}</h2>
        <span className="ml-auto rounded-full bg-white dark:bg-slate-900/70 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
          {ids.length}
        </span>
      </header>

      <SortableContext id={column.id} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2">
          {ids.map((id) => {
            const hidden = hiddenById.get(id);
            if (hidden) return <HiddenCard key={id} card={hidden} />;
            const card = cardsById.get(id);
            return card && <SortableCard key={id} card={card} actions={actions} canWrite={canWrite} />;
          })}
          {ids.length === 0 && (
            <p className="px-1 py-3 text-center text-xs text-slate-400 dark:text-slate-500" data-screenshot-ignore>
              {canWrite ? "No points yet — add one or drop a card here" : "No points"}
            </p>
          )}
        </div>
      </SortableContext>

      {canWrite && (
        <div className="mt-2">
          <CardComposer anonymous={anonymous} onAdd={(text) => actions.addCard(column.id, text)} />
        </div>
      )}
    </section>
  );
}
