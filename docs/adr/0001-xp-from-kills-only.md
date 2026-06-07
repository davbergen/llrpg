# XP comes only from monster kills, not per question

The first vertical-slice PRD (story #32) granted 5 XP per correctly-answered lesson question so that "studying feels rewarded on its own." Playtesting (issue #1, 2026-06-02) showed this made progression track *grinding questions* rather than *winning fights*, and let players out-level content without engaging combat. We removed per-question XP: monster and boss kills are now the sole XP source. The "studying is rewarded" intent survives through FSRS review scheduling and the streak system rather than raw XP.

This deliberately reverses PRD story #32 — a future reader checking the PRD against the code will see lessons grant no XP and may assume it's a regression. It is not. Do not re-add per-correct-answer XP without revisiting this decision.
