-- Tee store: initial schema
-- Money is stored in sen (RM 79.00 = 7900).

create type order_status as enum
  ('pending_payment', 'new', 'printing', 'shipped', 'cancelled');
create type shirt_size as enum ('S', 'M', 'L', 'XL', 'XXL', '3XL');

-- The 3-5 shirts on sale
create table products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  price_sen    int  not null check (price_sen > 0),
  -- [{key, name, hex, mockup}] where mockup is a path under /public
  colours      jsonb not null,
  sizes        shirt_size[] not null default '{S,M,L,XL,XXL,3XL}',
  -- where the A3 print box sits on the mockup image, in mockup pixels:
  -- {mockup_width, mockup_height, x, y, width, height}
  print_area   jsonb not null,
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- One customer design = one uploaded photo placed on one shirt
create table designs (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null,
  product_id        uuid not null references products(id),
  colour            text not null,
  original_path     text,
  preview_path      text,
  print_path        text,
  -- {cx, cy, width, rotation}: centre and width as fractions of the print area, rotation in degrees
  transform         jsonb,
  source_width      int,
  source_height     int,
  effective_dpi     int,
  consent_at        timestamptz not null,
  files_deleted_at  timestamptz,
  created_at        timestamptz not null default now()
);

create table orders (
  id                         uuid primary key default gen_random_uuid(),
  order_number               bigint generated always as identity (start with 1001) unique,
  status                     order_status not null default 'pending_payment',
  email                      text,
  customer_name              text,
  phone                      text,
  shipping_address           jsonb,
  subtotal_sen               int not null,
  shipping_sen               int not null default 0,
  total_sen                  int not null,
  currency                   text not null default 'myr',
  stripe_session_id          text unique,
  stripe_payment_intent_id   text,
  payment_method             text,
  courier                    text,
  tracking_number            text,
  feedback_token             uuid not null default gen_random_uuid(),
  paid_at                    timestamptz,
  printing_at                timestamptz,
  shipped_at                 timestamptz,
  confirmation_sent_at       timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create table order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  product_id      uuid not null references products(id),
  design_id       uuid not null references designs(id),
  product_name    text not null,
  colour          text not null,
  size            shirt_size not null,
  quantity        int not null check (quantity between 1 and 20),
  unit_price_sen  int not null
);

create table feedback (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid unique references orders(id) on delete set null,
  ease_of_use      smallint check (ease_of_use between 1 and 5),
  fair_price       smallint check (fair_price between 1 and 5),
  would_buy_again  text check (would_buy_again in ('yes', 'maybe', 'no')),
  comments         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on orders (status, created_at desc);
create index on order_items (order_id);
create index on order_items (design_id);
create index on designs (created_at) where files_deleted_at is null;

-- updated_at
create function set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();
create trigger feedback_updated_at before update on feedback
  for each row execute function set_updated_at();

-- Admins are users with app_metadata.role = 'admin' (set by hand in Supabase)
create function is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- Row Level Security: the public can read active products and nothing else.
-- All other writes go through server routes that use the service role key.
alter table products    enable row level security;
alter table designs     enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table feedback    enable row level security;

create policy "Anyone can read active products" on products
  for select to anon, authenticated using (active or is_admin());

create policy "Admins read designs" on designs
  for select to authenticated using (is_admin());
create policy "Admins read orders" on orders
  for select to authenticated using (is_admin());
create policy "Admins update orders" on orders
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "Admins read order items" on order_items
  for select to authenticated using (is_admin());
create policy "Admins read feedback" on feedback
  for select to authenticated using (is_admin());

-- Private bucket for customer images: designs/{design_id}/original|preview|print
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('designs', 'designs', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp']);
