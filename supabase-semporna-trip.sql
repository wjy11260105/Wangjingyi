-- 仙本那旅行手账云端同步数据表
-- 在 Supabase Dashboard > SQL Editor 中完整执行一次。

create extension if not exists pgcrypto;

create table if not exists public.semporna_trip_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in (
    'itinerary', 'wish', 'learning', 'reflection', 'expense', 'packing'
  )),
  trip_date date,
  start_time time,
  title text not null check (char_length(title) between 1 and 100),
  details text not null default '',
  category text not null default 'other',
  status text not null default 'pending',
  amount numeric(12,2) check (amount is null or amount >= 0),
  currency text not null default 'CNY',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.semporna_trip_items enable row level security;

drop policy if exists "own_select" on public.semporna_trip_items;
create policy "own_select"
  on public.semporna_trip_items for select
  using (auth.uid() = user_id);

drop policy if exists "own_insert" on public.semporna_trip_items;
create policy "own_insert"
  on public.semporna_trip_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "own_update" on public.semporna_trip_items;
create policy "own_update"
  on public.semporna_trip_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own_delete" on public.semporna_trip_items;
create policy "own_delete"
  on public.semporna_trip_items for delete
  using (auth.uid() = user_id);

create or replace function public.set_semporna_trip_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_semporna_trip_updated_at on public.semporna_trip_items;
create trigger set_semporna_trip_updated_at
  before update on public.semporna_trip_items
  for each row execute function public.set_semporna_trip_updated_at();

create index if not exists semporna_trip_user_date_idx
  on public.semporna_trip_items (user_id, trip_date, start_time);

create index if not exists semporna_trip_user_type_idx
  on public.semporna_trip_items (user_id, item_type);
