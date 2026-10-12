-- Likes on comments, mirroring card likes. Accessed only through API routes (service role).

create table if not exists comment_likes (
  comment_id text not null references comments(id) on delete cascade,
  participant_id text not null references participants(id) on delete cascade,
  primary key (comment_id, participant_id)
);

alter table comment_likes enable row level security;
