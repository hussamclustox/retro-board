import "server-only";
import { db } from "./supabaseServer";
import { HttpError, type Caller } from "./auth";
import type {
  AuthorView,
  BoardView,
  CardRow,
  CardView,
  ColumnRow,
  HiddenCardView,
  CommentLikeRow,
  CommentRow,
  LikeRow,
  ParticipantRow,
} from "./types";

interface RawBoard {
  columns: ColumnRow[];
  participants: ParticipantRow[];
  cards: CardRow[];
  likes: LikeRow[];
  comments: CommentRow[];
  commentLikes: CommentLikeRow[];
}

export async function loadRaw(boardId: string): Promise<RawBoard> {
  const supabase = db();
  const [columns, participants, cards] = await Promise.all([
    supabase.from("columns").select("*").eq("board_id", boardId).order("position"),
    supabase.from("participants").select("*").eq("board_id", boardId),
    supabase.from("cards").select("*").eq("board_id", boardId).order("position"),
  ]);
  for (const r of [columns, participants, cards]) if (r.error) throw new HttpError(500, r.error.message);

  const cardIds = (cards.data ?? []).map((c) => c.id);
  let likes: LikeRow[] = [];
  let comments: CommentRow[] = [];
  if (cardIds.length) {
    const [l, c] = await Promise.all([
      supabase.from("likes").select("*").in("card_id", cardIds),
      supabase.from("comments").select("*").in("card_id", cardIds).order("created_at"),
    ]);
    if (l.error) throw new HttpError(500, l.error.message);
    if (c.error) throw new HttpError(500, c.error.message);
    likes = l.data ?? [];
    comments = c.data ?? [];
  }
  let commentLikes: CommentLikeRow[] = [];
  if (comments.length) {
    const cl = await supabase
      .from("comment_likes")
      .select("*")
      .in("comment_id", comments.map((c) => c.id));
    if (cl.error) throw new HttpError(500, cl.error.message);
    commentLikes = cl.data ?? [];
  }
  return {
    columns: columns.data ?? [],
    participants: participants.data ?? [],
    cards: cards.data ?? [],
    likes,
    comments,
    commentLikes,
  };
}

/**
 * Build the board as this caller is allowed to see it.
 * - Anonymous authors' names are removed for everyone, the host included.
 * - Like lists are reduced to counts so participant ids never leak.
 * - While unrevealed, participants only see their own cards; others' become placeholders with just the author.
 */
export async function buildView(caller: Caller): Promise<BoardView> {
  const { board, isHost, participant } = caller;
  if (!participant) throw new HttpError(401, "Join the board first");
  const raw = await loadRaw(board.id);
  const people = new Map(raw.participants.map((p) => [p.id, p]));
  const me = participant.id;

  const author = (authorId: string): AuthorView => {
    const p = people.get(authorId);
    const anonymous = p?.anonymous ?? false;
    return { anonymous, name: !p ? "Unknown" : anonymous ? null : p.name };
  };

  const likesByCard = groupLikers(raw.likes.map((l) => [l.card_id, l.participant_id]));
  const likesByComment = groupLikers(raw.commentLikes.map((l) => [l.comment_id, l.participant_id]));
  const commentsByCard = new Map<string, CommentRow[]>();
  for (const c of raw.comments) {
    const list = commentsByCard.get(c.card_id) ?? [];
    list.push(c);
    commentsByCard.set(c.card_id, list);
  }

  const hiddenCards: HiddenCardView[] = [];
  const cards: CardView[] = [];
  for (const c of raw.cards) {
    if (!canSeeCard(caller, c)) {
      hiddenCards.push({ id: c.id, columnId: c.column_id, position: c.position, author: author(c.author_id) });
      continue;
    }
    const likers = likesByCard.get(c.id) ?? [];
    cards.push({
      id: c.id,
      columnId: c.column_id,
      text: c.text,
      position: c.position,
      createdAt: c.created_at,
      author: author(c.author_id),
      isMine: c.author_id === me,
      canEdit: isHost || c.author_id === me,
      likeCount: likers.length,
      likedByMe: likers.includes(me),
      comments: (commentsByCard.get(c.id) ?? []).map((cm) => {
        const commentLikers = likesByComment.get(cm.id) ?? [];
        return {
          id: cm.id,
          text: cm.text,
          createdAt: cm.created_at,
          author: author(cm.author_id),
          isMine: cm.author_id === me,
          canEdit: isHost || cm.author_id === me,
          likeCount: commentLikers.length,
          likedByMe: commentLikers.includes(me),
        };
      }),
    });
  }

  return {
    id: board.id,
    name: board.name,
    revealed: board.revealed,
    locked: board.locked,
    createdAt: board.created_at,
    role: isHost ? "host" : "participant",
    me: { id: participant.id, name: participant.name, anonymous: participant.anonymous },
    columns: raw.columns.map((c) => ({ id: c.id, title: c.title, color: c.color, position: c.position })),
    cards,
    hiddenCards,
  };
}

/** Full export for the host (embedded in the PDF download). Anonymous people stay anonymous here too. */
export async function exportBoard(caller: Caller) {
  const { board } = caller;
  const raw = await loadRaw(board.id);
  const people = new Map(raw.participants.map((p) => [p.id, p]));
  const anon = (id: string) => people.get(id)?.anonymous ?? false;
  const name = (id: string) => (anon(id) ? "Anonymous" : (people.get(id)?.name ?? "Unknown"));
  return {
    id: board.id,
    name: board.name,
    createdAt: board.created_at,
    exportedAt: new Date().toISOString(),
    // Listing anonymous people by name would reveal who chose anonymity, so they're only counted.
    participants: raw.participants.filter((p) => !p.anonymous).map((p) => ({ name: p.name, joinedAt: p.created_at })),
    anonymousParticipants: raw.participants.filter((p) => p.anonymous).length,
    columns: raw.columns.map((col) => ({
      title: col.title,
      cards: raw.cards
        .filter((c) => c.column_id === col.id)
        .map((c) => ({
          text: c.text,
          author: name(c.author_id),
          anonymous: anon(c.author_id),
          likes: raw.likes.filter((l) => l.card_id === c.id).length,
          createdAt: c.created_at,
          comments: raw.comments
            .filter((cm) => cm.card_id === c.id)
            .map((cm) => ({
              text: cm.text,
              author: name(cm.author_id),
              anonymous: anon(cm.author_id),
              likes: raw.commentLikes.filter((l) => l.comment_id === cm.id).length,
              createdAt: cm.created_at,
            })),
        })),
    })),
  };
}

/** Group [targetId, participantId] pairs into targetId -> participant ids. */
function groupLikers(pairs: [string, string][]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [target, participant] of pairs) {
    const list = map.get(target) ?? [];
    list.push(participant);
    map.set(target, list);
  }
  return map;
}

/** While the board is unrevealed, participants can only see their own cards. */
function canSeeCard({ board, isHost, participant }: Caller, card: CardRow) {
  return board.revealed || isHost || card.author_id === participant?.id;
}

/**
 * Load a card on the caller's board. Cards hidden from the caller count as missing, so hidden
 * placeholders can't be liked, commented on, moved or deleted.
 */
export async function getCard(caller: Caller, cardId: string): Promise<CardRow> {
  const { data, error } = await db()
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .eq("board_id", caller.board.id)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data || !canSeeCard(caller, data)) throw new HttpError(404, "Card not found");
  return data;
}
