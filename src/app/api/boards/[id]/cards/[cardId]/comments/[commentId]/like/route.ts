import { NextResponse } from "next/server";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { getCaller, handleError, HttpError, requireParticipant } from "@/lib/auth";
import { getCard } from "@/lib/boardData";

type Ctx = { params: Promise<{ id: string; cardId: string; commentId: string }> };

// Toggle the caller's like on a comment.
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id, cardId, commentId } = await params;
    const caller = await getCaller(req, id);
    const me = requireParticipant(caller);
    await getCard(caller, cardId);
    const supabase = db();
    const comment = await supabase.from("comments").select("id").eq("id", commentId).eq("card_id", cardId).maybeSingle();
    if (!comment.data) throw new HttpError(404, "Comment not found");
    const existing = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("participant_id", me.id)
      .maybeSingle();
    const { error } = existing.data
      ? await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("participant_id", me.id)
      : await supabase.from("comment_likes").insert({ comment_id: commentId, participant_id: me.id });
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ liked: !existing.data });
  } catch (err) {
    return handleError(err);
  }
}
