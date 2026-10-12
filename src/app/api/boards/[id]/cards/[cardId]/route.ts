import { NextResponse } from "next/server";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { cleanText, getCaller, handleError, HttpError, requireParticipant } from "@/lib/auth";
import { getCard } from "@/lib/boardData";
import { MAX_TEXT } from "@/lib/types";

type Ctx = { params: Promise<{ id: string; cardId: string }> };

// { text } edits (author or host). { columnId, position } moves (anyone).
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id, cardId } = await params;
    const caller = await getCaller(req, id);
    const me = requireParticipant(caller);
    const card = await getCard(caller, cardId);
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};

    if (body.text !== undefined) {
      if (card.author_id !== me.id && !caller.isHost) throw new HttpError(403, "You can only edit your own cards");
      patch.text = cleanText(body.text, MAX_TEXT);
    }
    if (body.columnId !== undefined || body.position !== undefined) {
      const columnId = String(body.columnId ?? card.column_id);
      const position = Number(body.position);
      if (!Number.isFinite(position)) throw new HttpError(400, "Invalid position");
      const col = await db().from("columns").select("id").eq("id", columnId).eq("board_id", id).maybeSingle();
      if (!col.data) throw new HttpError(400, "Unknown column");
      patch.column_id = columnId;
      patch.position = position;
    }
    if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update");

    const { error } = await db().from("cards").update(patch).eq("id", cardId);
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { id, cardId } = await params;
    const caller = await getCaller(req, id);
    const me = requireParticipant(caller);
    const card = await getCard(caller, cardId);
    if (card.author_id !== me.id && !caller.isHost) throw new HttpError(403, "You can only delete your own cards");
    const { error } = await db().from("cards").delete().eq("id", cardId);
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
