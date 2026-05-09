# Dungeon 1: Forest of First Words

Hiragana-themed introductory dungeon. Linear gating: clearing the boss unlocks
Dungeon 2. Mechanic note: standard damage curve, no special boss tricks.

---
kind: dungeon
id: forest-of-first-words
name: Forest of First Words
sprite: 🌲
order: 1
---
---
kind: monster
template: slime
name: Kana Slime
---
---
kind: monster
template: bat
name: Hiragana Bat
---
---
kind: monster
template: wolf
name: Kanji Wolf
---
---
kind: monster
template: slime
name: Particle Pup
hpMultiplier: 1.4
---
---
kind: monster
template: bat
name: Adverb Wisp
hpMultiplier: 1.3
counterMultiplier: 1.2
---
---
kind: monster
template: wolf
name: Verb Hound
hpMultiplier: 1.2
---
---
kind: boss
id: grammar-dragon
name: Grammar Dragon
sprite: 🐉
maxHp: 120
counterDmg: 15
goldMin: 40
goldMax: 80
itemDropChance: 1
guaranteedItem: true
---
