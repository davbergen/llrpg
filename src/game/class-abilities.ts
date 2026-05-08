import type { ClassType } from '../types';

export type SecondaryResource = 'rage' | 'faith';

export type AbilityEffect =
  | { kind: 'self_heal'; amount: number }
  | { kind: 'counter_reduction'; fraction: number }
  | { kind: 'damage_buff_next'; multiplier: number };

export interface ClassAbility {
  id: string;
  classType: ClassType;
  levelRequirement: number;
  label: string;
  mpCost: number;
  secondaryCost?: number;
  secondaryGain?: number;
  baseDamage: number;
  effects: AbilityEffect[];
  /**
   * Lesson question count, derived from mpCost via the slice-15 mapping
   * (1 MP → 1q, 2 MP → 2q, 4 MP → 3q). Stored explicitly so future tuning
   * can override per-ability.
   */
  lessonQuestions: number;
  /**
   * Inline doc for the solo-adjustment rule. If the ability was originally
   * an ally-target / taunt / party buff, this records what it became.
   */
  soloAdjustmentNote?: string;
}

export function lessonQuestionsForMp(mp: number): number {
  if (mp <= 1) return 1;
  if (mp <= 2) return 2;
  if (mp <= 4) return 3;
  return 4;
}

export const CLASS_ABILITIES: ClassAbility[] = [
  // ── Mage (mana-only): bursty caster ────────────────────────────
  {
    id: 'mage_spark',
    classType: 'mage',
    levelRequirement: 1,
    label: 'Spark',
    mpCost: 1,
    baseDamage: 12,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(1),
  },
  {
    id: 'mage_fireball',
    classType: 'mage',
    levelRequirement: 2,
    label: 'Fireball',
    mpCost: 2,
    baseDamage: 26,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(2),
  },
  {
    id: 'mage_frostbolt',
    classType: 'mage',
    levelRequirement: 3,
    label: 'Frostbolt',
    mpCost: 2,
    baseDamage: 30,
    effects: [{ kind: 'counter_reduction', fraction: 0.5 }],
    lessonQuestions: lessonQuestionsForMp(2),
  },
  {
    id: 'mage_arcane_pulse',
    classType: 'mage',
    levelRequirement: 4,
    label: 'Arcane Pulse',
    mpCost: 3,
    baseDamage: 45,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(3),
  },
  {
    id: 'mage_meteor',
    classType: 'mage',
    levelRequirement: 5,
    label: 'Meteor',
    mpCost: 4,
    baseDamage: 65,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(4),
  },
  {
    id: 'mage_chain_lightning',
    classType: 'mage',
    levelRequirement: 6,
    label: 'Chain Lightning',
    mpCost: 4,
    baseDamage: 70,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(4),
  },
  {
    id: 'mage_cataclysm',
    classType: 'mage',
    levelRequirement: 7,
    label: 'Cataclysm',
    mpCost: 5,
    baseDamage: 100,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(5),
  },

  // ── Warrior (mana + rage): wind-up / spend ─────────────────────
  {
    id: 'warrior_slash',
    classType: 'warrior',
    levelRequirement: 1,
    label: 'Slash',
    mpCost: 1,
    baseDamage: 12,
    secondaryGain: 2,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(1),
  },
  {
    id: 'warrior_cleave',
    classType: 'warrior',
    levelRequirement: 2,
    label: 'Cleave',
    mpCost: 2,
    baseDamage: 24,
    secondaryGain: 3,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(2),
  },
  {
    id: 'warrior_reckless_strike',
    classType: 'warrior',
    levelRequirement: 3,
    label: 'Reckless Strike',
    mpCost: 2,
    baseDamage: 32,
    secondaryGain: 4,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(2),
  },
  {
    id: 'warrior_iron_stance',
    classType: 'warrior',
    levelRequirement: 4,
    label: 'Iron Stance',
    mpCost: 1,
    baseDamage: 0,
    secondaryCost: 4,
    effects: [{ kind: 'counter_reduction', fraction: 0.6 }],
    lessonQuestions: lessonQuestionsForMp(1),
    soloAdjustmentNote:
      'Originally a taunt that pulls aggro. In solo, becomes a self-buff that reduces incoming counter by 60% this turn.',
  },
  {
    id: 'warrior_bash',
    classType: 'warrior',
    levelRequirement: 5,
    label: 'Bash',
    mpCost: 3,
    baseDamage: 50,
    secondaryCost: 5,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(3),
  },
  {
    id: 'warrior_berserker_roar',
    classType: 'warrior',
    levelRequirement: 6,
    label: 'Berserker Roar',
    mpCost: 2,
    baseDamage: 0,
    secondaryCost: 8,
    effects: [{ kind: 'damage_buff_next', multiplier: 1.6 }],
    lessonQuestions: lessonQuestionsForMp(2),
    soloAdjustmentNote:
      'Originally a party-wide damage buff. In solo, full self-buff: 1.6× damage on next attack.',
  },
  {
    id: 'warrior_execute',
    classType: 'warrior',
    levelRequirement: 7,
    label: 'Execute',
    mpCost: 4,
    baseDamage: 110,
    secondaryCost: 10,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(4),
  },

  // ── Priest (mana + faith): sustain ─────────────────────────────
  {
    id: 'priest_smite',
    classType: 'priest',
    levelRequirement: 1,
    label: 'Smite',
    mpCost: 1,
    baseDamage: 10,
    secondaryGain: 2,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(1),
  },
  {
    id: 'priest_holy_bolt',
    classType: 'priest',
    levelRequirement: 2,
    label: 'Holy Bolt',
    mpCost: 2,
    baseDamage: 22,
    secondaryGain: 3,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(2),
  },
  {
    id: 'priest_heal',
    classType: 'priest',
    levelRequirement: 3,
    label: 'Heal',
    mpCost: 2,
    baseDamage: 0,
    secondaryCost: 4,
    effects: [{ kind: 'self_heal', amount: 25 }],
    lessonQuestions: lessonQuestionsForMp(2),
    soloAdjustmentNote: 'Originally heals an ally. In solo, heals self for 25 HP.',
  },
  {
    id: 'priest_radiant_strike',
    classType: 'priest',
    levelRequirement: 4,
    label: 'Radiant Strike',
    mpCost: 3,
    baseDamage: 38,
    secondaryGain: 4,
    effects: [],
    lessonQuestions: lessonQuestionsForMp(3),
  },
  {
    id: 'priest_greater_heal',
    classType: 'priest',
    levelRequirement: 5,
    label: 'Greater Heal',
    mpCost: 3,
    baseDamage: 0,
    secondaryCost: 6,
    effects: [{ kind: 'self_heal', amount: 55 }],
    lessonQuestions: lessonQuestionsForMp(3),
    soloAdjustmentNote: 'Originally heals an ally for a large amount. In solo, heals self for 55 HP.',
  },
  {
    id: 'priest_divine_shield',
    classType: 'priest',
    levelRequirement: 6,
    label: 'Divine Shield',
    mpCost: 2,
    baseDamage: 0,
    secondaryCost: 8,
    effects: [{ kind: 'counter_reduction', fraction: 1 }],
    lessonQuestions: lessonQuestionsForMp(2),
    soloAdjustmentNote:
      'Originally a party shield. Full self-buff in solo: blocks all counter damage this turn.',
  },
  {
    id: 'priest_judgment',
    classType: 'priest',
    levelRequirement: 7,
    label: 'Judgment',
    mpCost: 4,
    baseDamage: 80,
    secondaryCost: 10,
    effects: [{ kind: 'self_heal', amount: 20 }],
    lessonQuestions: lessonQuestionsForMp(4),
  },
];

export function abilitiesForClass(classType: ClassType): ClassAbility[] {
  return CLASS_ABILITIES.filter((a) => a.classType === classType).sort(
    (a, b) => a.levelRequirement - b.levelRequirement,
  );
}

export function unlockedAbilities(classType: ClassType, level: number): ClassAbility[] {
  return abilitiesForClass(classType).filter((a) => a.levelRequirement <= level);
}

export function findAbilityById(id: string): ClassAbility | undefined {
  return CLASS_ABILITIES.find((a) => a.id === id);
}

export function secondaryResourceForClass(
  classType: ClassType,
): SecondaryResource | null {
  if (classType === 'warrior') return 'rage';
  if (classType === 'priest') return 'faith';
  return null;
}
