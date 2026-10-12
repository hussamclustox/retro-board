import { NextResponse } from "next/server";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { getCaller, handleError, HttpError, requireHost } from "@/lib/auth";
import { buildView } from "@/lib/boardData";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const caller = await getCaller(req, id);
    if (!caller.participant) {
      // Not joined yet: expose only what the join screen needs.
      return NextResponse.json({ joined: false, board: { id, name: caller.board.name } });
    }
    return NextResponse.json({ joined: true, board: await buildView(caller) });
  } catch (err) {
    return handleError(err);
  }
}

// Host toggles: { revealed?, locked?, name? }
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const caller = await getCaller(req, id);
    requireHost(caller);
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body.revealed === "boolean") patch.revealed = body.revealed;
    if (typeof body.locked === "boolean") patch.locked = body.locked;
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 120);
    if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update");
    const { error } = await db().from("boards").update(patch).eq("id", id);
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const caller = await getCaller(req, id);
    requireHost(caller);
    const { error } = await db().from("boards").delete().eq("id", id);
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
