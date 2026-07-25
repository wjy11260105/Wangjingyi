-- 人生管理系统数据库升级脚本
-- 在 Supabase Dashboard > SQL Editor 中完整执行一次。
-- 所有数据表都启用 RLS，每个账号只能访问自己的记录。

create extension if not exists pgcrypto;

create table if not exists public.life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  slug text not null,
  color text not null default '#4f8468',
  icon text not null default '○',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, slug)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  status text not null default 'active' check (status in ('planning', 'active', 'paused', 'completed', 'archived')),
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  status text not null default 'active' check (status in ('planning', 'active', 'paused', 'completed', 'archived')),
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null check (char_length(title) between 1 and 60),
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'custom')),
  target_count integer not null default 1 check (target_count > 0),
  unit text not null default '次',
  active boolean not null default true,
  color text not null default '#4f8468',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  count integer not null default 1 check (count >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (habit_id, log_date)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  period_start date not null,
  period_end date not null,
  highlights text not null default '',
  improvements text not null default '',
  next_focus text not null default '',
  mood integer check (mood between 1 and 5),
  energy_score integer check (energy_score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sport_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  schedule_event_id uuid,
  sport_type text not null,
  session_date date not null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  distance_km numeric(8,2) check (distance_km >= 0),
  intensity integer check (intensity between 1 and 5),
  feeling text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  book_title text not null,
  author text not null default '',
  log_date date not null,
  pages_read integer not null default 0 check (pages_read >= 0),
  minutes integer not null default 0 check (minutes >= 0),
  status text not null default 'reading' check (status in ('wishlist', 'reading', 'finished', 'paused')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  destination text not null default '',
  start_date date,
  end_date date,
  status text not null default 'planning' check (status in ('idea', 'planning', 'booked', 'completed')),
  budget numeric(12,2) check (budget >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  modality text not null check (modality in ('tarot', 'ziwei', 'bazi', 'general')),
  reflection_date date not null default current_date,
  title text not null,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  verification text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 兼容尚未执行旧版脚本的新项目。
create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null default 'life',
  event_date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  location text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.schedule_events
  add column if not exists life_area_id uuid references public.life_areas(id) on delete set null,
  add column if not exists goal_id uuid references public.goals(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists completed boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sport_sessions_schedule_event_id_fkey'
  ) then
    alter table public.sport_sessions
      add constraint sport_sessions_schedule_event_id_fkey
      foreign key (schedule_event_id) references public.schedule_events(id) on delete set null;
  end if;
end $$;

-- 自动维护 updated_at，供手机与电脑增量合并。
create or replace function public.set_updated_at()
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

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'life_areas', 'goals', 'projects', 'habits', 'habit_logs', 'reviews',
    'sport_sessions', 'reading_logs', 'trips', 'reflections', 'schedule_events'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

-- 每张表统一启用“仅本人可见”的增删改查策略。
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'life_areas', 'goals', 'projects', 'habits', 'habit_logs', 'reviews',
    'sport_sessions', 'reading_logs', 'trips', 'reflections', 'schedule_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "own_select" on public.%I', table_name);
    execute format('drop policy if exists "own_insert" on public.%I', table_name);
    execute format('drop policy if exists "own_update" on public.%I', table_name);
    execute format('drop policy if exists "own_delete" on public.%I', table_name);
    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id)', table_name);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id)', table_name);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id)', table_name);
  end loop;
end $$;

create index if not exists goals_user_status_idx on public.goals (user_id, status);
create index if not exists projects_user_goal_idx on public.projects (user_id, goal_id);
create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, log_date);
create index if not exists reviews_user_period_idx on public.reviews (user_id, period_start desc);
create index if not exists sport_sessions_user_date_idx on public.sport_sessions (user_id, session_date desc);
create index if not exists reading_logs_user_date_idx on public.reading_logs (user_id, log_date desc);
create index if not exists trips_user_start_idx on public.trips (user_id, start_date desc);
create index if not exists reflections_user_date_idx on public.reflections (user_id, reflection_date desc);
create index if not exists schedule_events_user_date_idx on public.schedule_events (user_id, event_date);
