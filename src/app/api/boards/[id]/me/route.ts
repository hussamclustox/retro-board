import { NextResponse } from "next/server";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { getCaller, handleError, HttpError, requireParticipant } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// Update the caller's own settings: { anonymous }. Applies to all their cards and comments on this board.
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const caller = await getCaller(req, id);
    const me = requireParticipant(caller, { write: false });
    const body = await req.json().catch(() => ({}));
    if (typeof body.anonymous !== "boolean") throw new HttpError(400, "anonymous must be a boolean");
    const { error } = await db().from("participants").update({ anonymous: body.anonymous }).eq("id", me.id);
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
