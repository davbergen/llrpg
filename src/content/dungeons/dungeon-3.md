# Dungeon 3: Spire of Kanji

Late-game dungeon. Boss "Radical Titan" enrages below 50% HP — counter damage
multiplied by `enrageCounterMultiplier`.

---
kind: dungeon
id: spire-of-kanji
name: Spire of Kanji
sprite: 🗼
order: 3
tier: 3
intendedLevel: 6
unlocksFrom: crypt-of-conjugations
---
---
kind: monster
template: imp
name: Stroke Imp
---
---
kind: monster
template: golem
name: Radical Golem
hpMultiplier: 1.3
---
---
kind: monster
template: imp
name: Compound Demon
hpMultiplier: 1.4
counterMultiplier: 1.1
---
---
kind: monster
template: spectre
name: On-Yomi Specter
hpMultiplier: 1.5
---
---
kind: monster
template: imp
name: Kun-Yomi Fiend
hpMultiplier: 1.6
counterMultiplier: 1.2
---
---
kind: monster
template: golem
name: Joyo Sentinel
hpMultiplier: 1.8
counterMultiplier: 1.3
---
---
kind: boss
id: radical-titan
name: Radical Titan
sprite: 🛡️
maxHp: 260
counterDmg: 18
goldMin: 80
goldMax: 100
itemDropChance: 1
guaranteedItem: true
enrageBelowPct: 0.5
enrageCounterMultiplier: 1.4
---
