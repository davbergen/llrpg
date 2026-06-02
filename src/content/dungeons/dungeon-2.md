# Dungeon 2: Crypt of Conjugations

Mid-game dungeon. Boss "Tense Lich" grows unstable as it weakens — below 50% HP
it enrages, hitting harder (`enrageBelowPct` / `enrageCounterMultiplier` in
combat-engine). (Balance note: its earlier HP-regen mechanic was retired during
the 3-class balance pass — pure regen made the fight bimodal/untunable across
classes; enrage is the tuned difficulty lever. See docs/STATUS-content-balance.md.)

---
kind: dungeon
id: crypt-of-conjugations
name: Crypt of Conjugations
sprite: 🪦
order: 2
tier: 2
intendedLevel: 4
unlocksFrom: forest-of-first-words
---
---
kind: monster
template: spectre
name: Past-Tense Wraith
---
---
kind: monster
template: golem
name: Stem Golem
---
---
kind: monster
template: spectre
name: Polite Phantom
hpMultiplier: 1.2
---
---
kind: monster
template: bat
name: Casual Bat
hpMultiplier: 1.6
---
---
kind: monster
template: wolf
name: Negation Wolf
hpMultiplier: 1.5
counterMultiplier: 1.2
---
---
kind: monster
template: golem
name: Te-Form Golem
hpMultiplier: 1.4
---
---
kind: boss
id: tense-lich
name: Tense Lich
sprite: 💀
maxHp: 260
counterDmg: 15
goldMin: 65
goldMax: 90
itemDropChance: 1
guaranteedItem: true
enrageBelowPct: 0.5
enrageCounterMultiplier: 1.5
---
