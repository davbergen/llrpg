-- LinguaQuest v1 schema (slice 20)
-- 8 tables, RLS keyed on auth.uid(), report-driven card quarantine trigger.

-- =============================================================================
-- heroes
-- =============================================================================
create table public.heroes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  class_type text check (class_type in ('mage', 'warrior', 'priest')),
  level int not null default 1,
  xp int not null default 0,
  hp int not null default 100,
  max_hp int not null default 100,
  gold int not null default 0,
  gems int not null default 0,
  mana int not null default 10,
  mana_cap int not null default 10,
  mana_resets_at timestamptz,
  first_lesson_today_at timestamptz,
  secondary_resource text,
  secondary_value int not null default 0,
  streak_days int not null default 0,
  streak_freezes int not null default 0,
  last_active_date date,
  equipment jsonb not null default '{}'::jsonb,
  abilities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.heroes enable row level security;

create policy "heroes_select_own" on public.heroes
  for select using (auth.uid() = user_id);
create policy "heroes_insert_own" on public.heroes
  for insert with check (auth.uid() = user_id);
create policy "heroes_update_own" on public.heroes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "heroes_delete_own" on public.heroes
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- fsrs_cards
-- =============================================================================
create table public.fsrs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spine_entry_id text not null,
  face text not null,
  state text not null default 'new' check (state in ('new', 'learning', 'review', 'relearning')),
  stability real not null default 0,
  difficulty real not null default 0,
  due_at timestamptz,
  last_reviewed_at timestamptz,
  reps int not null default 0,
  lapses int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, spine_entry_id, face)
);

create index fsrs_cards_user_due_idx on public.fsrs_cards (user_id, due_at);

alter table public.fsrs_cards enable row level security;

create policy "fsrs_cards_select_own" on public.fsrs_cards
  for select using (auth.uid() = user_id);
create policy "fsrs_cards_insert_own" on public.fsrs_cards
  for insert with check (auth.uid() = user_id);
create policy "fsrs_cards_update_own" on public.fsrs_cards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fsrs_cards_delete_own" on public.fsrs_cards
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- inventory
-- =============================================================================
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item jsonb not null,
  equipped_slot text,
  acquired_at timestamptz not null default now()
);

create index inventory_user_idx on public.inventory (user_id);

alter table public.inventory enable row level security;

create policy "inventory_select_own" on public.inventory
  for select using (auth.uid() = user_id);
create policy "inventory_insert_own" on public.inventory
  for insert with check (auth.uid() = user_id);
create policy "inventory_update_own" on public.inventory
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inventory_delete_own" on public.inventory
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- dungeon_runs
-- =============================================================================
create table public.dungeon_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dungeon_id text not null,
  current_monster_index int not null default 0,
  monster_hp int,
  monster_max_hp int,
  last_progressed_at timestamptz not null default now(),
  cleared_at timestamptz,
  created_at timestamptz not null default now()
);

create index dungeon_runs_user_idx on public.dungeon_runs (user_id, dungeon_id);

alter table public.dungeon_runs enable row level security;

create policy "dungeon_runs_select_own" on public.dungeon_runs
  for select using (auth.uid() = user_id);
create policy "dungeon_runs_insert_own" on public.dungeon_runs
  for insert with check (auth.uid() = user_id);
create policy "dungeon_runs_update_own" on public.dungeon_runs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dungeon_runs_delete_own" on public.dungeon_runs
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- lesson_sessions
-- =============================================================================
create table public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ability_id text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  correct_count int not null default 0,
  total_count int not null default 0,
  accuracy real,
  fsrs_snapshot jsonb
);

create index lesson_sessions_user_idx on public.lesson_sessions (user_id, started_at desc);

alter table public.lesson_sessions enable row level security;

create policy "lesson_sessions_select_own" on public.lesson_sessions
  for select using (auth.uid() = user_id);
create policy "lesson_sessions_insert_own" on public.lesson_sessions
  for insert with check (auth.uid() = user_id);
create policy "lesson_sessions_update_own" on public.lesson_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lesson_sessions_delete_own" on public.lesson_sessions
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- reports
-- =============================================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spine_entry_id text not null,
  face text not null,
  reason text not null,
  note text,
  created_at timestamptz not null default now()
);

create index reports_entry_idx on public.reports (spine_entry_id, face);
create index reports_user_idx on public.reports (user_id);

alter table public.reports enable row level security;

-- Reporters can only insert their own report and read their own history.
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = user_id);
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = user_id);

-- =============================================================================
-- gem_ledger
-- =============================================================================
create table public.gem_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index gem_ledger_user_idx on public.gem_ledger (user_id, created_at desc);

alter table public.gem_ledger enable row level security;

create policy "gem_ledger_select_own" on public.gem_ledger
  for select using (auth.uid() = user_id);
create policy "gem_ledger_insert_own" on public.gem_ledger
  for insert with check (auth.uid() = user_id);

-- =============================================================================
-- card_quarantine
-- =============================================================================
create table public.card_quarantine (
  spine_entry_id text not null,
  face text not null,
  report_count int not null default 0,
  distinct_user_count int not null default 0,
  quarantined_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (spine_entry_id, face)
);

alter table public.card_quarantine enable row level security;

-- All authenticated users can read quarantine state (so the client can skip them).
create policy "card_quarantine_select_authed" on public.card_quarantine
  for select to authenticated using (true);
-- No insert/update/delete policies → only the trigger (security definer) writes.

-- =============================================================================
-- Trigger: bump card_quarantine on report insert
-- =============================================================================
create or replace function public.bump_card_quarantine()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_distinct_users int;
  v_total_reports int;
begin
  select count(*), count(distinct user_id)
    into v_total_reports, v_distinct_users
    from public.reports
    where spine_entry_id = new.spine_entry_id and face = new.face;

  insert into public.card_quarantine (spine_entry_id, face, report_count, distinct_user_count, quarantined_at, updated_at)
  values (
    new.spine_entry_id,
    new.face,
    v_total_reports,
    v_distinct_users,
    case when v_distinct_users >= 3 then now() else null end,
    now()
  )
  on conflict (spine_entry_id, face) do update
  set report_count = excluded.report_count,
      distinct_user_count = excluded.distinct_user_count,
      quarantined_at = coalesce(public.card_quarantine.quarantined_at, excluded.quarantined_at),
      updated_at = now();

  return new;
end;
$$;

create trigger reports_bump_quarantine
  after insert on public.reports
  for each row
  execute function public.bump_card_quarantine();
