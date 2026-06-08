# Mana is the only combat resource — Rage and Faith removed

Combat carried a second per-run currency on top of Mana: Warriors built and spent **Rage**, Priests built and spent **Faith** (a `SecondaryResources` module, reset every dungeon run), while Mages used neither. Playtesting (2026-06-08) found this over-complicated for a study-gated game: the player's working memory should go to the Japanese, not to tracking a second combat meter. The glossary reflected the same imbalance — the whole documented economy (Burst ability, Efficiency ability, Daily mana budget) is defined in terms of Mana, and Rage/Faith never appeared in it at all.

We removed Rage and Faith. All three classes are now Mana-only. The eight abilities that built or spent the secondary resource were re-priced: builders (Slash, Cleave, Smite, …) simply drop their now-meaningless gain, and the heavily-gated spenders (Execute, Judgment, Berserker Roar, Divine Shield, the heals) had the old secondary gate **folded into MP** so they sit correctly on the damage-per-MP curve rather than becoming cheap and spammable. Class identity now rests on ability *effects* (heals, Stances, buffs) and the damage curve, not on a resource economy.

This is re-tuned strictly within ADR-0002 — equal-MP abilities must remain a real damage-vs-utility choice, and no ability may strictly dominate another.

A future reader will find a `SecondaryResources` subsystem in git history and notice the Warrior/Priest "wind-up / spend" identity has flattened to mana-only, and may assume the build/spend mechanic was lost by accident. It was removed deliberately for cognitive simplicity. Do not reintroduce a second combat resource without revisiting this decision.
