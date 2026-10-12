import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db, notifyChanged } from "@/lib/supabaseServer";
import { cleanText, getCaller, handleError, hashToken, HttpError, newToken } from "@/lib/auth";
import { MAX_NAME } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await getCaller(req, id); // 404s if the board does not exist
    const body = await req.json().catch(() => ({}));
    const name = cleanText(body.name, MAX_NAME);
    const participantId = nanoid(12);
    const participantToken = newToken();
    const { error } = await db()
      .from("participants")
      .insert({ id: participantId, board_id: id, name, token_hash: hashToken(participantToken) });
    if (error) throw new HttpError(500, error.message);
    await notifyChanged(id);
    return NextResponse.json({ identity: { participantId, participantToken, name } });
  } catch (err) {
    return handleError(err);
  }
}
