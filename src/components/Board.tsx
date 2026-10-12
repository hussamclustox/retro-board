"use client";
import { forwardRef, useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { BoardView } from "@/lib/types";
import type { BoardActions } from "@/lib/useBoard";
import { Column } from "./Column";
import { CardBody } from "./Card";

type Lanes = Record<string, string[]>;

interface Props {
  board: BoardView;
  actions: BoardActions;
  canWrite: boolean;
}

/** Columns are fixed; cards can be dragged within and between columns. */
export const Board = forwardRef<HTMLDivElement, Props>(function Board({ board, actions, canWrite }, ref) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const cardsById = useMemo(() => new Map(board.cards.map((c) => [c.id, c])), [board.cards]);
  const hiddenById = useMemo(() => new Map(board.hiddenCards.map((c) => [c.id, c])), [board.hiddenCards]);
  // Positions of everything in the lanes, hidden placeholders included, for computing drop positions.
  const positions = useMemo(
    () => new Map([...board.cards, ...board.hiddenCards].map((c) => [c.id, c.position])),
    [board.cards, board.hiddenCards],
  );

  // Card ids per column (hidden placeholders included), ordered by position — the server's truth.
  const lanes = useMemo<Lanes>(() => {
    const result: Lanes = Object.fromEntries(board.columns.map((c) => [c.id, []]));
    [...board.cards, ...board.hiddenCards]
      .sort((a, b) => a.position - b.position)
      .forEach((c) => result[c.columnId]?.push(c.id));
    return result;
  }, [board.columns, board.cards, board.hiddenCards]);

  // While dragging we work on a local copy so cards can hop between columns before drop.
  const [dragLanes, setDragLanes] = useState<Lanes | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const view = dragLanes ?? lanes;

  const laneOf = (id: string, l: Lanes) => (id in l ? id : Object.keys(l).find((k) => l[k].includes(id)));

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragLanes(lanes);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setDragLanes((l) => {
      if (!l) return l;
      const from = laneOf(String(active.id), l);
      const to = laneOf(String(over.id), l);
      if (!from || !to || from === to) return l;
      const target = l[to];
      const overIndex = target.indexOf(String(over.id));
      const index = overIndex >= 0 ? overIndex : target.length;
      return {
        ...l,
        [from]: l[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const l = dragLanes;
    setActiveId(null);
    setDragLanes(null);
    if (!l || !over) return;

    const id = String(active.id);
    const lane = laneOf(id, l);
    if (!lane) return;
    let list = l[lane];
    const overIndex = list.indexOf(String(over.id));
    if (overIndex >= 0) list = arrayMove(list, list.indexOf(id), overIndex);

    // Fractional position between the new neighbours.
    const i = list.indexOf(id);
    const prev = positions.get(list[i - 1]);
    const next = positions.get(list[i + 1]);
    const position =
      prev !== undefined && next !== undefined
        ? (prev + next) / 2
        : prev !== undefined
          ? prev + 1000
          : next !== undefined
            ? next - 1000
            : 1000;

    const card = cardsById.get(id);
    if (card && (card.columnId !== lane || lanes[lane].indexOf(id) !== i)) {
      actions.moveCard(id, lane, position);
    }
  };

  const activeCard = activeId ? cardsById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDragLanes(null);
      }}
    >
      <div ref={ref} className="grid items-start gap-4 md:grid-cols-3">
        {board.columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            ids={view[col.id] ?? []}
            cardsById={cardsById}
            hiddenById={hiddenById}
            actions={actions}
            canWrite={canWrite}
            anonymous={board.me.anonymous}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard && <CardBody card={activeCard} actions={actions} canWrite={canWrite} overlay />}
      </DragOverlay>
    </DndContext>
  );
});
