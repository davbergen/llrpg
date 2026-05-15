-- Slice 22: GDPR delete with 24-hour hold.
-- Stores a "delete this account after run_after" marker per user. The
-- run-scheduled-deletions Edge Function reads rows where run_after < now()
-- and hard-deletes in dependency order using the service role.

create table public.scheduled_deletions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  run_after timestamptz not null default (now() + interval '24 hours')
);

alter table public.scheduled_deletions enable row level security;

-- Users can see, request, and cancel their own deletion. The service-role
-- cleanup job bypasses RLS.
create policy "scheduled_deletions_select_own" on public.scheduled_deletions
  for select using (auth.uid() = user_id);
create policy "scheduled_deletions_insert_own" on public.scheduled_deletions
  for insert with check (auth.uid() = user_id);
create policy "scheduled_deletions_delete_own" on public.scheduled_deletions
  for delete using (auth.uid() = user_id);
