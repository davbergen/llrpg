# Dungeon 5: Hall of Counters

Tier-3 dungeon reached from the Garden, themed on Japanese counter words
(個・本・枚・匹・冊). Boss "Counter Colossus" enrages below 50% HP. Same intended
level (6) as its sibling the Spire; reuses the Spire's tuned boss numbers.

---
kind: dungeon
id: hall-of-counters
name: Hall of Counters
sprite: 🏯
order: 5
tier: 3
intendedLevel: 6
unlocksFrom: garden-of-particles
---
---
kind: monster
template: imp
name: Ippon Imp
---
---
kind: monster
template: golem
name: Mai Golem
hpMultiplier: 1.3
---
---
kind: monster
template: imp
name: Ko Fiend
hpMultiplier: 1.4
counterMultiplier: 1.1
---
---
kind: monster
template: spectre
name: Satsu Specter
hpMultiplier: 1.5
---
---
kind: monster
template: imp
name: Hon Demon
hpMultiplier: 1.6
counterMultiplier: 1.2
---
---
kind: monster
template: golem
name: Dai Sentinel
hpMultiplier: 1.8
counterMultiplier: 1.3
---
---
kind: boss
id: counter-colossus
name: Counter Colossus
sprite: 🏯
maxHp: 260
counterDmg: 18
goldMin: 80
goldMax: 100
itemDropChance: 1
guaranteedItem: true
enrageBelowPct: 0.5
enrageCounterMultiplier: 1.4
---
