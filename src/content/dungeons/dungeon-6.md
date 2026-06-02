# Dungeon 6: Citadel of Keigo

Tier-4 endgame dungeon off the Spire, themed on honorific speech (敬語:
丁寧語・尊敬語・謙譲語). Intended for level 6 — the same level as the tier-3 dungeons,
deliberately: the three classes are only balanced against each other below level 7
(where the premium spenders Cataclysm / Execute / Judgment unlock and break class
symmetry — see docs/STATUS-content-balance.md and bands.ts). The top tier is made
harder than tier 3 via a tankier boss, not a higher intended level. "Keigo
Emperor" enrages below 50% HP. Tuned green against the bands.

---
kind: dungeon
id: citadel-of-keigo
name: Citadel of Keigo
sprite: 🏰
order: 6
tier: 4
intendedLevel: 6
unlocksFrom: spire-of-kanji
---
---
kind: monster
template: imp
name: Teineigo Imp
hpMultiplier: 1.2
---
---
kind: monster
template: golem
name: Sonkeigo Golem
hpMultiplier: 1.5
---
---
kind: monster
template: imp
name: Kenjougo Fiend
hpMultiplier: 1.5
counterMultiplier: 1.2
---
---
kind: monster
template: spectre
name: Humble Phantom
hpMultiplier: 1.7
---
---
kind: monster
template: golem
name: Polite Sentinel
hpMultiplier: 1.9
counterMultiplier: 1.2
---
---
kind: monster
template: imp
name: Honorific Demon
hpMultiplier: 1.8
counterMultiplier: 1.3
---
---
kind: boss
id: keigo-emperor
name: Keigo Emperor
sprite: 🏰
maxHp: 262
counterDmg: 18
goldMin: 100
goldMax: 130
itemDropChance: 1
guaranteedItem: true
enrageBelowPct: 0.5
enrageCounterMultiplier: 1.4
---
