import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "./supabaseServer";
import { HttpError } from "./errors";
import type { BoardRow, ParticipantRow } from "./types";

export function newToken() {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function matches(token: string | null, hash: string) {
  if (!token) return false;
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface Caller {
  board: BoardRow;
  isHost: boolean;
  participant: ParticipantRow | null;
}

export { HttpError };

/** Resolve who is calling from the x-host-token / x-participant-* headers. */
export async function getCaller(req: Request, boardId: string): Promise<Caller> {
  const { data: board, error } = await db().from("boards").select("*").eq("id", boardId).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!board) throw new HttpError(404, "Board not found");

  const isHost = matches(req.headers.get("x-host-token"), board.host_token_hash);

  let participant: ParticipantRow | null = null;
  const pid = req.headers.get("x-participant-id");
  const ptoken = req.headers.get("x-participant-token");
  if (pid && ptoken) {
    const { data } = await db()
      .from("participants")
      .select("*")
      .eq("id", pid)
      .eq("board_id", boardId)
      .maybeSingle();
    if (data && matches(ptoken, data.token_hash)) participant = data;
  }
  return { board, isHost, participant };
}

/** Caller must be a joined participant (the host is one too). Blocks writes on locked boards for non-hosts. */
export function requireParticipant(caller: Caller, { write = true } = {}): ParticipantRow {
  if (!caller.participant) throw new HttpError(401, "Join the board first");
  if (write && caller.board.locked && !caller.isHost) throw new HttpError(423, "Board is locked");
  return caller.participant;
}

export function requireHost(caller: Caller) {
  if (!caller.isHost) throw new HttpError(403, "Host only");
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(err);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") throw new HttpError(400, "Text is required");
  const text = value.trim();
  if (!text) throw new HttpError(400, "Text is required");
  if (text.length > max) throw new HttpError(400, `Text must be at most ${max} characters`);
  return text;
}
