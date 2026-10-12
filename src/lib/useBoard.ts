"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { api, ApiError } from "./api";
import { realtimeClient } from "./supabaseClient";
import { getIdentity, saveIdentity } from "./storage";
import type { BoardView, CardView, Identity } from "./types";

type Status = "loading" | "join" | "ready" | "missing" | "error";

export interface OnlineUser {
  key: string;
  name: string;
}

interface BoardResponse {
  joined: boolean;
  board: BoardView | { id: string; name: string };
}

const tempId = () => `tmp-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Loads a board through the API and keeps it live:
 * - every write is applied optimistically, then confirmed by refetching;
 * - other clients' writes arrive as a Supabase broadcast "changed" ping, which triggers a refetch;
 * - presence tracks who is online.
 */
export function useBoard(boardId: string) {
  const [status, setStatus] = useState<Status>("loading");
  const [board, setBoard] = useState<BoardView | null>(null);
  const [boardName, setBoardName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [connected, setConnected] = useState(false);

  // While our own writes are in flight, hold off applying fetched state so optimistic updates don't flicker.
  const inflight = useRef(0);
  const fetching = useRef(false);
  const refetchQueued = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    if (fetching.current) {
      refetchQueued.current = true;
      return;
    }
    fetching.current = true;
    try {
      const data = await api<BoardResponse>(`/boards/${boardId}`, { boardId });
      setBoardName(data.board.name);
      if (!data.joined) {
        setStatus("join");
      } else if (inflight.current === 0) {
        setBoard(data.board as BoardView);
        setStatus("ready");
      }
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setStatus("missing");
      else {
        setError(err instanceof Error ? err.message : "Failed to load board");
        setStatus((s) => (s === "loading" ? "error" : s));
      }
    } finally {
      fetching.current = false;
      if (refetchQueued.current) {
        refetchQueued.current = false;
        void refresh();
      }
    }
  }, [boardId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime subscription (after we know who we are).
  const meId = board?.me.id;
  const presenceName = board ? (board.me.anonymous ? "Anonymous" : board.me.name) : null;
  useEffect(() => {
    const supabase = realtimeClient();
    if (!supabase || !meId) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`board:${boardId}`, { config: { presence: { key: meId } } });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "changed" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => void refresh(), 120);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string }>();
        setOnline(Object.entries(state).map(([key, metas]) => ({ key, name: metas[0]?.name ?? "Someone" })));
      })
      .subscribe((s) => {
        setConnected(s === "SUBSCRIBED");
        if (s === "SUBSCRIBED") void refresh(); // catch anything missed while connecting
      });

    return () => {
      clearTimeout(timer);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [boardId, meId, refresh]);

  // Keep our presence name current (e.g. after toggling anonymous).
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !presenceName || !connected) return;
    void channel.track({ name: presenceName });
  }, [presenceName, connected]);

  // Safety net: refetch when the tab regains focus and every 30s in case a ping was missed.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => void refresh(), 30_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [refresh]);

  /** Apply `optimistic` locally, run `request`, then refetch the server truth. */
  const mutate = useCallback(
    async (optimistic: ((b: BoardView) => BoardView) | null, request: () => Promise<unknown>) => {
      if (optimistic) setBoard((b) => (b ? optimistic(b) : b));
      inflight.current++;
      try {
        await request();
        setError(null);
      } catch (err) {
        // The refetch below rolls back the optimistic change; surface the reason as a toast.
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        inflight.current--;
        void refresh();
      }
    },
    [refresh],
  );

  const updateCard = (cardId: string, fn: (c: CardView) => CardView) => (b: BoardView) => ({
    ...b,
    cards: b.cards.map((c) => (c.id === cardId ? fn(c) : c)),
  });

  const actions = {
    join: async (name: string) => {
      const { identity } = await api<{ identity: Identity }>(`/boards/${boardId}/join`, {
        method: "POST",
        body: { name },
        boardId,
      });
      saveIdentity(boardId, identity);
      setStatus("loading");
      await refresh();
    },

    addCard: (columnId: string, text: string) =>
      mutate(
        (b) => {
          const inColumn = b.cards.filter((c) => c.columnId === columnId);
          const position = Math.max(0, ...inColumn.map((c) => c.position)) + 1000;
          const card: CardView = {
            id: tempId(),
            columnId,
            text,
            position,
            createdAt: new Date().toISOString(),
            author: { name: b.me.name, anonymous: b.me.anonymous },
            isMine: true,
            canEdit: true,
            likeCount: 0,
            likedByMe: false,
            comments: [],
          };
          return { ...b, cards: [...b.cards, card] };
        },
        () => api(`/boards/${boardId}/cards`, { method: "POST", body: { columnId, text }, boardId }),
      ),

    editCard: (cardId: string, text: string) =>
      mutate(updateCard(cardId, (c) => ({ ...c, text })), () =>
        api(`/boards/${boardId}/cards/${cardId}`, { method: "PATCH", body: { text }, boardId }),
      ),

    deleteCard: (cardId: string) =>
      mutate(
        (b) => ({ ...b, cards: b.cards.filter((c) => c.id !== cardId) }),
        () => api(`/boards/${boardId}/cards/${cardId}`, { method: "DELETE", boardId }),
      ),

    moveCard: (cardId: string, columnId: string, position: number) =>
      mutate(updateCard(cardId, (c) => ({ ...c, columnId, position })), () =>
        api(`/boards/${boardId}/cards/${cardId}`, { method: "PATCH", body: { columnId, position }, boardId }),
      ),

    toggleLike: (cardId: string) =>
      mutate(
        updateCard(cardId, (c) => ({
          ...c,
          likedByMe: !c.likedByMe,
          likeCount: c.likeCount + (c.likedByMe ? -1 : 1),
        })),
        () => api(`/boards/${boardId}/cards/${cardId}/like`, { method: "POST", boardId }),
      ),

    addComment: (cardId: string, text: string) =>
      mutate(
        (b) =>
          updateCard(cardId, (c) => ({
            ...c,
            comments: [
              ...c.comments,
              {
                id: tempId(),
                text,
                createdAt: new Date().toISOString(),
                author: { name: b.me.name, anonymous: b.me.anonymous },
                isMine: true,
                canEdit: true,
                likeCount: 0,
                likedByMe: false,
              },
            ],
          }))(b),
        () => api(`/boards/${boardId}/cards/${cardId}/comments`, { method: "POST", body: { text }, boardId }),
      ),

    editComment: (cardId: string, commentId: string, text: string) =>
      mutate(
        updateCard(cardId, (c) => ({
          ...c,
          comments: c.comments.map((cm) => (cm.id === commentId ? { ...cm, text } : cm)),
        })),
        () =>
          api(`/boards/${boardId}/cards/${cardId}/comments/${commentId}`, { method: "PATCH", body: { text }, boardId }),
      ),

    toggleCommentLike: (cardId: string, commentId: string) =>
      mutate(
        updateCard(cardId, (c) => ({
          ...c,
          comments: c.comments.map((cm) =>
            cm.id === commentId
              ? { ...cm, likedByMe: !cm.likedByMe, likeCount: cm.likeCount + (cm.likedByMe ? -1 : 1) }
              : cm,
          ),
        })),
        () => api(`/boards/${boardId}/cards/${cardId}/comments/${commentId}/like`, { method: "POST", boardId }),
      ),

    deleteComment: (cardId: string, commentId: string) =>
      mutate(
        updateCard(cardId, (c) => ({ ...c, comments: c.comments.filter((cm) => cm.id !== commentId) })),
        () => api(`/boards/${boardId}/cards/${cardId}/comments/${commentId}`, { method: "DELETE", boardId }),
      ),

    setAnonymous: (anonymous: boolean) =>
      mutate(
        (b) => ({
          ...b,
          me: { ...b.me, anonymous },
          cards: b.cards.map((c) => ({
            ...c,
            author: c.isMine ? { ...c.author, anonymous } : c.author,
            comments: c.comments.map((cm) => (cm.isMine ? { ...cm, author: { ...cm.author, anonymous } } : cm)),
          })),
        }),
        () => api(`/boards/${boardId}/me`, { method: "PATCH", body: { anonymous }, boardId }),
      ),

    setBoardFlags: (flags: { revealed?: boolean; locked?: boolean }) =>
      mutate(
        (b) => ({ ...b, ...flags }),
        () => api(`/boards/${boardId}`, { method: "PATCH", body: flags, boardId }),
      ),
  };

  return {
    status,
    board,
    boardName,
    error,
    clearError: () => setError(null),
    online,
    connected,
    realtimeConfigured: realtimeClient() !== null,
    hasIdentity: () => getIdentity(boardId) !== null,
    actions,
  };
}

export type BoardActions = ReturnType<typeof useBoard>["actions"];
