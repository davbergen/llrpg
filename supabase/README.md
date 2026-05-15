# Supabase

## Local setup

Install the Supabase CLI (https://supabase.com/docs/guides/cli) then from the repo root:

```
supabase link --project-ref wlxiajoegqbiwpzqbjmi
supabase db push
```

`db push` applies every file in `migrations/` that hasn't been applied yet to the linked remote project.

## Schema overview

8 tables, all RLS-protected on `auth.uid()`:

- `heroes` — one row per user, holds character + currency state
- `fsrs_cards` — per-user spaced-repetition state (one row per spine entry × face)
- `inventory` — per-user item drops, optional equipped slot
- `dungeon_runs` — per-user dungeon progress (current monster, monster HP)
- `lesson_sessions` — per-user lesson telemetry + FSRS snapshot for retries
- `reports` — per-user content reports (insert-only from clients, with a trigger)
- `gem_ledger` — append-only gem balance changes
- `card_quarantine` — global; written only by the `reports_bump_quarantine` trigger.
  When ≥3 distinct users report the same `(spine_entry_id, face)`, `quarantined_at` is stamped.
- `scheduled_deletions` — one row per user with a pending GDPR delete; the
  `run-scheduled-deletions` Edge Function hard-deletes rows whose `run_after`
  has passed.

## Edge Functions

Live under `functions/`, deployed with `supabase functions deploy <name>`.

- `export-user-data` — auth required. Returns a JSON blob with every row
  keyed on the caller across the 7 per-user tables.
- `schedule-deletion` — auth required. Upserts a `scheduled_deletions` row
  with `run_after = now() + 24h`.
- `cancel-deletion` — auth required. Deletes the caller's
  `scheduled_deletions` row.
- `run-scheduled-deletions` — **service-role only**. Schedule via the
  Supabase cron dashboard (hourly is fine). Reads due rows, hard-deletes
  every per-user table in dependency order, calls `auth.admin.deleteUser`,
  then removes the marker. Set `SCHEDULED_DELETIONS_CRON_SECRET` to allow
  invoking with a bearer token instead of the service key.
