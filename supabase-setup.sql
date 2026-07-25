-- 在 Supabase Dashboard 的 SQL Editor 中执行一次。
-- 为每个登录用户创建相互隔离的日程存储。

create table if not exists public.schedule_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  type text not null check (type in ('competition', 'sport', 'work', 'study', 'life')),
  event_date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  location text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.schedule_events enable row level security;

drop policy if exists "Users can read own schedule events" on public.schedule_events;
create policy "Users can read own schedule events"
  on public.schedule_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own schedule events" on public.schedule_events;
create policy "Users can insert own schedule events"
  on public.schedule_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own schedule events" on public.schedule_events;
create policy "Users can update own schedule events"
  on public.schedule_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own schedule events" on public.schedule_events;
create policy "Users can delete own schedule events"
  on public.schedule_events for delete
  using (auth.uid() = user_id);

create index if not exists schedule_events_user_date_idx
  on public.schedule_events (user_id, event_date);
