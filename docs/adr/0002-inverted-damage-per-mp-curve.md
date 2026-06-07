# Damage-per-MP decreases as MP cost rises (small = efficient, big = burst)

Playtesting (issues #2 and #7, 2026-06-02) found low-MP abilities had no reason to exist: the table gave high-MP abilities *more* damage-per-MP, and since the monster Counter is a fixed per-turn hit, big abilities also won by killing in fewer turns (fewer Counters taken). Both axes favored spamming the biggest affordable ability.

We inverted the curve. Low-MP **Efficiency** abilities now deliver more total damage per point of Mana (and more lessons studied) but make you eat more Counters — an HP-and-time cost. High-MP **Burst** abilities cost an MP premium per point of damage but kill in fewer turns, so they trade Mana for HP-safety and tempo. The fixed per-turn Counter is the lever that makes both ends viable. All three classes' ability tables are tuned against this principle, and no ability may strictly dominate another (equal MP must be a real damage-vs-utility choice).

This reverses the intuitive "bigger ability = better value" expectation. A future reader will see an expensive ability that is *less* MP-efficient than a cheap one and may assume it's a tuning bug. It is deliberate. Re-tune within the curve, but do not flatten or re-invert it without revisiting this decision.
