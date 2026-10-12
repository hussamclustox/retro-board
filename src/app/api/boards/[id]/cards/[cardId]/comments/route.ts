import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { cleanText, getCaller, handleError, HttpError, requireParticipant } from "@/lib/auth";
import { getCard } from "@/lib/boardData";
import { MAX_TEXT } from "@/lib/types";

type Ctx = { params: Promise<{ id: string; cardId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id, cardId } = await params;
    const caller = await getCaller(req, id);
    const me = requireParticipant(caller);
    await getCard(caller, cardId);
    const body = await req.json().catch(() => ({}));
    const text = cleanText(body.text, MAX_TEXT);
    const commentId = nanoid(12);
    const { error } = await db().from("comments").insert({ id: commentId, card_id: cardId, author_id: me.id, text });
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ id: commentId });
  } catch (err) {
    return handleError(err);
  }
}
