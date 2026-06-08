# LinguaQuest

A single-player Japanese-learning RPG where lessons are the cost of combat: pick an ability, pass its lesson, deal damage. This glossary fixes the project's domain language so the same concept isn't named three different ways across code, content, and player-facing copy.

## Language

**Spine**:
The curated content corpus — the vocab, grammar, and kanji entries authored in markdown that the whole game draws from.
_Avoid_: corpus, deck, word list

**Face**:
One quiz form of a Spine entry (recall, reverse, cloze, meaning, reading). A single entry can be asked in several faces.
_Avoid_: question type, mode

**Card**:
An internal scheduling unit — one Spine entry paired with one Face, tracked by FSRS for review timing. **Engineering term only — never shown to players.**
_Avoid_: (in player-facing copy) the word "card" entirely

**Review**:
The player-facing name for a due Card. Notifications, prompts, and UI say "review" / "training", never "card".
_Avoid_: card due, SRS item

**Counter**:
The monster's fixed retaliation hit, applied once per combat turn regardless of which ability was used. The lever that makes turn-count matter.
_Avoid_: counterattack damage, retaliation

**Stance**:
A multi-turn defensive buff: a wind-up turn (zero damage, full Counter taken) enters the Stance, which then reduces the Counter on the following turns. Because every turn costs one Counter, mitigation only earns its turn when it spans several — a Stance does, a same-turn block does not.
_Avoid_: shield, guard, block (as the name of the multi-turn buff)

**On-hit mitigation**:
Counter reduction bundled onto a damaging ability, applying only to that turn's Counter. Always worth it — you progress and mitigate at once — so it never needs the Stance treatment.
_Avoid_: counter reduction (unqualified — say "Stance" or "on-hit mitigation")

**Burst ability**:
A high-MP ability: fewer casts per day, but kills in fewer turns so you eat fewer Counters. Convenience and HP-safety at an MP premium.

**Efficiency ability**:
A low-MP ability: more total damage per point of Mana and more lessons studied, paid for by taking more Counters (HP risk) and more turns.
_Avoid_: weak ability, cheap ability

**Daily mana budget**:
The per-day Mana pool that bounds how much combat (and therefore study) happens in a session — roughly 2–3 Burst casts or 8–10 Efficiency casts.
