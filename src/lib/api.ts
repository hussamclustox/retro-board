"use client";
import { getHostToken, getIdentity } from "./storage";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function authHeaders(boardId?: string): Record<string, string> {
  if (!boardId) return {};
  const headers: Record<string, string> = {};
  const hostToken = getHostToken(boardId);
  if (hostToken) headers["x-host-token"] = hostToken;
  const identity = getIdentity(boardId);
  if (identity) {
    headers["x-participant-id"] = identity.participantId;
    headers["x-participant-token"] = identity.participantToken;
  }
  return headers;
}

/** JSON fetch against our API routes, sending this browser's credentials for the board. */
export async function api<T = unknown>(
  path: string,
  { method = "GET", body, boardId }: { method?: string; body?: unknown; boardId?: string } = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    cache: "no-store",
    headers: { "content-type": "application/json", ...authHeaders(boardId) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}
