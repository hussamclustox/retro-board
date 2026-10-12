import { NextResponse } from "next/server";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { cleanText, getCaller, handleError, HttpError, requireParticipant, type Caller } from "@/lib/auth";
import { getCard } from "@/lib/boardData";
import { MAX_TEXT } from "@/lib/types";

type Ctx = { params: Promise<{ id: string; cardId: string; commentId: string }> };

async function requireCommentAccess(caller: Caller, boardId: string, cardId: string, commentId: string) {
  const me = requireParticipant(caller);
  await getCard(caller, cardId);
  const { data } = await db().from("comments").select("*").eq("id", commentId).eq("card_id", cardId).maybeSingle();
  if (!data) throw new HttpError(404, "Comment not found");
  if (data.author_id !== me.id && !caller.isHost) throw new HttpError(403, "You can only change your own comments");
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id, cardId, commentId } = await params;
    const caller = await getCaller(req, id);
    await requireCommentAccess(caller, id, cardId, commentId);
    const body = await req.json().catch(() => ({}));
    const { error } = await db().from("comments").update({ text: cleanText(body.text, MAX_TEXT) }).eq("id", commentId);
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { id, cardId, commentId } = await params;
    const caller = await getCaller(req, id);
    await requireCommentAccess(caller, id, cardId, commentId);
    const { error } = await db().from("comments").delete().eq("id", commentId);
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
