import { NextResponse } from "next/server";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { getCaller, handleError, HttpError, requireParticipant } from "@/lib/auth";
import { getCard } from "@/lib/boardData";

type Ctx = { params: Promise<{ id: string; cardId: string }> };

// Toggle the caller's like on a card.
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id, cardId } = await params;
    const caller = await getCaller(req, id);
    const me = requireParticipant(caller);
    await getCard(caller, cardId);
    const supabase = db();
    const existing = await supabase
      .from("likes")
      .select("card_id")
      .eq("card_id", cardId)
      .eq("participant_id", me.id)
      .maybeSingle();
    const { error } = existing.data
      ? await supabase.from("likes").delete().eq("card_id", cardId).eq("participant_id", me.id)
      : await supabase.from("likes").insert({ card_id: cardId, participant_id: me.id });
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ liked: !existing.data });
  } catch (err) {
    return handleError(err);
  }
}
