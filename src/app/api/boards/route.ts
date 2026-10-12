import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/supabaseServer";
import { cleanText, handleError, hashToken, HttpError, newToken } from "@/lib/auth";
import { DEFAULT_COLUMNS, MAX_NAME, type BoardSummary } from "@/lib/types";

// Create a board with the default columns. The creator becomes host and first participant.
// Points start hidden; the host reveals them when everyone is done.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = cleanText(body.name, 120);
    const hostName = cleanText(body.hostName ?? "Host", MAX_NAME);
    const supabase = db();

    const boardId = nanoid(10);
    const hostToken = newToken();
    const participantId = nanoid(12);
    const participantToken = newToken();

    const board = await supabase.from("boards").insert({ id: boardId, name, host_token_hash: hashToken(hostToken), revealed: false });
    if (board.error) throw new HttpError(500, board.error.message);

    const [cols, host] = await Promise.all([
      supabase.from("columns").insert(
        DEFAULT_COLUMNS.map((c, i) => ({ id: nanoid(10), board_id: boardId, title: c.title, color: c.color, position: i })),
      ),
      supabase
        .from("participants")
        .insert({ id: participantId, board_id: boardId, name: hostName, token_hash: hashToken(participantToken) }),
    ]);
    if (cols.error) throw new HttpError(500, cols.error.message);
    if (host.error) throw new HttpError(500, host.error.message);

    return NextResponse.json({
      boardId,
      hostToken,
      identity: { participantId, participantToken, name: hostName },
    });
  } catch (err) {
    return handleError(err);
  }
}

// Dashboard summaries for the boards this browser hosts (?ids=a,b,c).
export async function GET(req: Request) {
  try {
    const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 200);
    if (!ids.length) return NextResponse.json({ boards: [] });
    const supabase = db();
    const [boards, cards, people] = await Promise.all([
      supabase.from("boards").select("id,name,created_at,locked").in("id", ids),
      supabase.from("cards").select("board_id").in("board_id", ids),
      supabase.from("participants").select("board_id").in("board_id", ids),
    ]);
    for (const r of [boards, cards, people]) if (r.error) throw new HttpError(500, r.error.message);
    const count = (rows: { board_id: string }[], id: string) => rows.filter((r) => r.board_id === id).length;
    const summaries: BoardSummary[] = (boards.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      createdAt: b.created_at,
      locked: b.locked,
      cardCount: count(cards.data ?? [], b.id),
      participantCount: count(people.data ?? [], b.id),
    }));
    return NextResponse.json({ boards: summaries });
  } catch (err) {
    return handleError(err);
  }
}
