import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./errors";

let client: SupabaseClient | null = null;

/** Service-role client. Bypasses RLS — never import from client components. */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new HttpError(
        500,
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local.",
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/** Tell connected clients that the board changed. Carries no board data. */
export async function notifyChanged(boardId: string) {
  const supabase = db();
  const channel = supabase.channel(`board:${boardId}`);
  try {
    await channel.httpSend("changed", { at: Date.now() });
  } catch (err) {
    console.error("realtime broadcast failed", err);
  } finally {
    await supabase.removeChannel(channel);
  }
}
