# Dungeon 4: Garden of Particles

Tier-2 sibling of the Crypt — a second route off the Forest, themed on the case
particles (は・を・に・へ・が・の). Boss "Particle Sovereign" enrages below 50% HP,
the same tuned difficulty lever as the Crypt's Tense Lich (see
docs/STATUS-content-balance.md). Same intended level (4) as its sibling so the
tier stays flat; reuses the Crypt's tuned boss numbers.

---
kind: dungeon
id: garden-of-particles
name: Garden of Particles
sprite: 🌸
order: 3
tier: 2
intendedLevel: 4
unlocksFrom: forest-of-first-words
---
---
kind: monster
template: bat
name: Wa Wisp
---
---
kind: monster
template: spectre
name: Wo Wraith
---
---
kind: monster
template: golem
name: Ni Golem
hpMultiplier: 1.2
---
---
kind: monster
template: wolf
name: He Hound
hpMultiplier: 1.5
---
---
kind: monster
template: spectre
name: Ga Ghost
hpMultiplier: 1.4
counterMultiplier: 1.2
---
---
kind: monster
template: golem
name: No Knight
hpMultiplier: 1.4
---
---
kind: boss
id: particle-sovereign
name: Particle Sovereign
sprite: 🌸
maxHp: 260
counterDmg: 15
goldMin: 65
goldMax: 90
itemDropChance: 1
guaranteedItem: true
enrageBelowPct: 0.5
enrageCounterMultiplier: 1.5
---
