-- Slice 21: write-through state blob.
-- The repo layer serializes the full PersistedState into heroes.state for v1.
-- Normalized columns (level, xp, etc.) remain for analytics + future granular reads,
-- but the client treats `state` as the source of truth.

alter table public.heroes
  add column if not exists state jsonb;
