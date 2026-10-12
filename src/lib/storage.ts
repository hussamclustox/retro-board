"use client";
import type { Identity } from "./types";

// localStorage only holds identity: which boards this browser hosts, and who it is on each board.
// Every access is wrapped because storage can be unavailable (private mode, blocked site data).

const HOSTED = "retro:hosted";
const HOST_NAME = "retro:hostName";
const identityKey = (boardId: string) => `retro:identity:${boardId}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export interface HostedBoard {
  token: string;
  createdAt: string;
}

export function getHostedBoards(): Record<string, HostedBoard> {
  return read<Record<string, HostedBoard>>(HOSTED, {});
}

export function getHostToken(boardId: string): string | null {
  return getHostedBoards()[boardId]?.token ?? null;
}

export function saveHostedBoard(boardId: string, token: string) {
  write(HOSTED, { ...getHostedBoards(), [boardId]: { token, createdAt: new Date().toISOString() } });
}

export function forgetBoard(boardId: string) {
  const hosted = getHostedBoards();
  delete hosted[boardId];
  write(HOSTED, hosted);
  write(identityKey(boardId), undefined);
}

export function getIdentity(boardId: string): Identity | null {
  return read<Identity | null>(identityKey(boardId), null);
}

export function saveIdentity(boardId: string, identity: Identity) {
  write(identityKey(boardId), identity);
}

export function getHostName(): string {
  return read<string>(HOST_NAME, "");
}

export function saveHostName(name: string) {
  write(HOST_NAME, name);
}

// Per-browser UI preference, read before first paint by the inline script in layout.tsx.
const THEME = "retro:theme"; // also hard-coded in layout.tsx
export type Theme = "light" | "dark";

export function saveTheme(theme: Theme) {
  write(THEME, theme);
}
