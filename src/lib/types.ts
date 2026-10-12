export type Role = "host" | "participant";

export interface ColumnView {
  id: string;
  title: string;
  color: string;
  position: number;
}

export interface AuthorView {
  /** Real name. Null for anonymous authors, for every viewer including the host. */
  name: string | null;
  anonymous: boolean;
}

export interface CommentView {
  id: string;
  text: string;
  createdAt: string;
  author: AuthorView;
  isMine: boolean;
  canEdit: boolean;
  likeCount: number;
  likedByMe: boolean;
}

export interface CardView {
  id: string;
  columnId: string;
  text: string;
  position: number;
  createdAt: string;
  author: AuthorView;
  isMine: boolean;
  canEdit: boolean;
  likeCount: number;
  likedByMe: boolean;
  comments: CommentView[];
}

export interface HiddenCardView {
  id: string;
  columnId: string;
  position: number;
  /** Same rules as visible cards: no name when the author is anonymous. */
  author: AuthorView;
}

export interface BoardView {
  id: string;
  name: string;
  revealed: boolean;
  locked: boolean;
  createdAt: string;
  role: Role;
  me: { id: string; name: string; anonymous: boolean };
  columns: ColumnView[];
  cards: CardView[];
  /** Placeholders for other people's cards while the board is unrevealed: where they sit and who wrote them, no content. */
  hiddenCards: HiddenCardView[];
}

export interface BoardSummary {
  id: string;
  name: string;
  createdAt: string;
  cardCount: number;
  participantCount: number;
  locked: boolean;
}

export interface Identity {
  participantId: string;
  participantToken: string;
  name: string;
}

// Database rows
export interface BoardRow {
  id: string;
  name: string;
  host_token_hash: string;
  revealed: boolean;
  locked: boolean;
  created_at: string;
}
export interface ColumnRow {
  id: string;
  board_id: string;
  title: string;
  color: string;
  position: number;
}
export interface ParticipantRow {
  id: string;
  board_id: string;
  name: string;
  token_hash: string;
  anonymous: boolean;
  created_at: string;
}
export interface CardRow {
  id: string;
  board_id: string;
  column_id: string;
  text: string;
  author_id: string;
  position: number;
  created_at: string;
}
export interface LikeRow {
  card_id: string;
  participant_id: string;
}
export interface CommentLikeRow {
  comment_id: string;
  participant_id: string;
}
export interface CommentRow {
  id: string;
  card_id: string;
  author_id: string;
  text: string;
  created_at: string;
}

export const DEFAULT_COLUMNS = [
  { title: "Went Well", color: "emerald" },
  { title: "To Improve", color: "amber" },
  { title: "Action Items", color: "sky" },
] as const;

export const MAX_TEXT = 1000;
export const MAX_NAME = 60;
