-- Retro Board schema. Run once in the Supabase SQL editor.
-- All access goes through Next.js API routes using the service-role key,
-- so RLS is enabled with no policies (the anon key cannot read or write tables).

create table if not exists boards (
  id text primary key,
  name text not null,
  host_token_hash text not null,
  revealed boolean not null default true,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists columns (
  id text primary key,
  board_id text not null references boards(id) on delete cascade,
  title text not null,
  color text not null,
  position int not null
);

create table if not exists participants (
  id text primary key,
  board_id text not null references boards(id) on delete cascade,
  name text not null,
  token_hash text not null,
  anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id text primary key,
  board_id text not null references boards(id) on delete cascade,
  column_id text not null references columns(id) on delete cascade,
  text text not null,
  author_id text not null references participants(id) on delete cascade,
  position double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists likes (
  card_id text not null references cards(id) on delete cascade,
  participant_id text not null references participants(id) on delete cascade,
  primary key (card_id, participant_id)
);

create table if not exists comments (
  id text primary key,
  card_id text not null references cards(id) on delete cascade,
  author_id text not null references participants(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists columns_board_idx on columns(board_id);
create index if not exists participants_board_idx on participants(board_id);
create index if not exists cards_board_idx on cards(board_id);
create index if not exists comments_card_idx on comments(card_id);

alter table boards enable row level security;
alter table columns enable row level security;
alter table participants enable row level security;
alter table cards enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
