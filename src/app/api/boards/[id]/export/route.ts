import { NextResponse } from "next/server";
import { getCaller, handleError, requireHost } from "@/lib/auth";
import { exportBoard } from "@/lib/boardData";

type Ctx = { params: Promise<{ id: string }> };

// Host-only: the full board as JSON, embedded in the PDF the browser builds.
// Host-only because it includes points that are still hidden from participants.
export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const caller = await getCaller(req, id);
    requireHost(caller);
    return NextResponse.json(await exportBoard(caller));
  } catch (err) {
    return handleError(err);
  }
}
