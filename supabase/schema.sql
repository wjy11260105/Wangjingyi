-- 在 Supabase Dashboard -> SQL Editor 中执行一次。
-- 每位用户只有一行 JSON 数据，RLS 保证只能访问自己的数据。

create table if not exists public.life_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.life_data enable row level security;

drop policy if exists "Users can read own life data" on public.life_data;
create policy "Users can read own life data"
on public.life_data
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own life data" on public.life_data;
create policy "Users can insert own life data"
on public.life_data
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own life data" on public.life_data;
create policy "Users can update own life data"
on public.life_data
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own life data" on public.life_data;
create policy "Users can delete own life data"
on public.life_data
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.life_data to authenticated;

create or replace function public.set_life_data_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_life_data_updated_at on public.life_data;
create trigger set_life_data_updated_at
before update on public.life_data
for each row execute function public.set_life_data_updated_at();
