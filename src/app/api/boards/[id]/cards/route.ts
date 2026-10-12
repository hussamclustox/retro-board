import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { cleanText, getCaller, handleError, HttpError, requireParticipant } from "@/lib/auth";
import { MAX_TEXT } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const caller = await getCaller(req, id);
    const me = requireParticipant(caller);
    const body = await req.json().catch(() => ({}));
    const text = cleanText(body.text, MAX_TEXT);
    const columnId = String(body.columnId ?? "");
    const supabase = db();

    const col = await supabase.from("columns").select("id").eq("id", columnId).eq("board_id", id).maybeSingle();
    if (!col.data) throw new HttpError(400, "Unknown column");

    // Append to the end of the column.
    const last = await supabase
      .from("cards")
      .select("position")
      .eq("column_id", columnId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (last.data?.position ?? 0) + 1000;

    const cardId = nanoid(12);
    const { error } = await supabase
      .from("cards")
      .insert({ id: cardId, board_id: id, column_id: columnId, text, author_id: me.id, position });
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ id: cardId, position });
  } catch (err) {
    return handleError(err);
  }
}
