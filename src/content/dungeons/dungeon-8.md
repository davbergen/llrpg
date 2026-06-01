# Dungeon 8: Labyrinth of Loanwords

Tier-4 endgame dungeon, a second route off the Spire, themed on katakana
loanwords (外来語・和製英語). Intended for level 6 — top-tier difficulty comes from a
tankier boss, not a higher level (classes only stay balanced below L7; see
dungeon-6.md / docs/STATUS-content-balance.md). "Loanword Leviathan" enrages below
45% HP. Tuned green against the bands.

---
kind: dungeon
id: labyrinth-of-loanwords
name: Labyrinth of Loanwords
sprite: 🌀
order: 8
tier: 4
intendedLevel: 6
unlocksFrom: spire-of-kanji
---
---
kind: monster
template: imp
name: Katakana Imp
hpMultiplier: 1.3
---
---
kind: monster
template: golem
name: Gairaigo Golem
hpMultiplier: 1.6
---
---
kind: monster
template: imp
name: Loanword Fiend
hpMultiplier: 1.6
counterMultiplier: 1.2
---
---
kind: monster
template: spectre
name: Wasei Phantom
hpMultiplier: 1.8
---
---
kind: monster
template: golem
name: English Sentinel
hpMultiplier: 2.0
counterMultiplier: 1.3
---
---
kind: monster
template: imp
name: Foreign Demon
hpMultiplier: 2.0
counterMultiplier: 1.3
---
---
kind: boss
id: loanword-leviathan
name: Loanword Leviathan
sprite: 🌀
maxHp: 264
counterDmg: 18
goldMin: 110
goldMax: 140
itemDropChance: 1
guaranteedItem: true
enrageBelowPct: 0.45
enrageCounterMultiplier: 1.5
---
