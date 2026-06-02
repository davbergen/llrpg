# Dungeon 7: Sanctum of Idioms

Tier-4 endgame dungeon off the Hall of Counters, themed on set phrases
(四字熟語・諺). Intended for level 6 — top-tier difficulty comes from a tankier boss,
not a higher level (classes only stay balanced below L7; see dungeon-6.md /
docs/STATUS-content-balance.md). "Idiom Sphinx" enrages below 50% HP. Tuned green
against the bands.

---
kind: dungeon
id: sanctum-of-idioms
name: Sanctum of Idioms
sprite: ⛩️
order: 7
tier: 4
intendedLevel: 6
unlocksFrom: hall-of-counters
---
---
kind: monster
template: imp
name: Yoji Imp
hpMultiplier: 1.3
---
---
kind: monster
template: golem
name: Kotowaza Golem
hpMultiplier: 1.5
---
---
kind: monster
template: imp
name: Idiom Fiend
hpMultiplier: 1.6
counterMultiplier: 1.2
---
---
kind: monster
template: spectre
name: Proverb Phantom
hpMultiplier: 1.8
---
---
kind: monster
template: golem
name: Saying Sentinel
hpMultiplier: 2.0
counterMultiplier: 1.2
---
---
kind: monster
template: imp
name: Adage Demon
hpMultiplier: 1.9
counterMultiplier: 1.3
---
---
kind: boss
id: idiom-sphinx
name: Idiom Sphinx
sprite: ⛩️
maxHp: 264
counterDmg: 19
goldMin: 105
goldMax: 135
itemDropChance: 1
guaranteedItem: true
enrageBelowPct: 0.5
enrageCounterMultiplier: 1.35
---
