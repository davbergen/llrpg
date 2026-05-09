# Dungeon 2: Crypt of Conjugations

Mid-game dungeon. Boss "Tense Lich" regenerates HP each turn — see
`regenPerTurn` in combat-engine.

---
kind: dungeon
id: crypt-of-conjugations
name: Crypt of Conjugations
sprite: 🪦
order: 2
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
maxHp: 180
counterDmg: 18
goldMin: 70
goldMax: 130
itemDropChance: 1
guaranteedItem: true
regenPerTurn: 8
---
