-- Slice 23: persist the player's answer to the post-class-pick telemetry consent prompt.
-- null = not asked yet; true = opted in; false = opted out.
-- The PostHog wiring lands in a follow-up slice; this column is the persistent gate.

alter table public.heroes
  add column if not exists telemetry_consent boolean;
