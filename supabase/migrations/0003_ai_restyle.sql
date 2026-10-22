-- Gemini photo restyle: which picture prints, and a log used for the daily limit.

alter table designs
  add column style text not null default 'original',
  add column source_path text;  -- the image that prints; null means original_path

create table ai_requests (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null,
  design_id   uuid references designs(id) on delete set null,
  style       text not null,
  model       text not null,
  ok          boolean not null,
  error       text,
  created_at  timestamptz not null default now()
);

create index on ai_requests (client_id, created_at desc);

-- Server-only, like the other tables.
alter table ai_requests enable row level security;
create policy "Admins read AI requests" on ai_requests
  for select to authenticated using (is_admin());
