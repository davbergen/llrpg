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
   * Plain-language description of what the ability does, shown in the combat
   * select-then-confirm panel above "USE ABILITY" so the player can make an
   * informed choice. Phrased in terms of the real effect.
   */
  description: string;
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
  if (mp <= 1) return 5;
  if (mp <= 2) return 10;
  if (mp <= 4) return 15;
  return 20;
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
    description: 'A quick jolt of arcane energy.',
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
    description: 'Hurls a ball of flame at the enemy.',
    lessonQuestions: lessonQuestionsForMp(2),
  },
  {
    id: 'mage_frostbolt',
    classType: 'mage',
    levelRequirement: 3,
    label: 'Frostbolt',
    mpCost: 2,
    baseDamage: 30,
    effects: [{ kind: 'counter_reduction', fraction: 0.35 }],
    description: 'A chilling bolt that also weakens the enemy’s counterattack this turn.',
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
    description: 'A burst of raw arcane force.',
    lessonQuestions: lessonQuestionsForMp(3),
  },
  {
    id: 'mage_meteor',
    classType: 'mage',
    levelRequirement: 5,
    label: 'Meteor',
    mpCost: 4,
    baseDamage: 38,
    effects: [],
    description: 'Calls down a meteor for heavy damage.',
    lessonQuestions: lessonQuestionsForMp(4),
  },
  {
    id: 'mage_chain_lightning',
    classType: 'mage',
    levelRequirement: 6,
    label: 'Chain Lightning',
    mpCost: 4,
    baseDamage: 40,
    effects: [],
    description: 'Lightning that arcs through the enemy.',
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
    description: 'A devastating arcane explosion — your biggest hit.',
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
    description: 'A basic sword strike that builds Rage.',
    lessonQuestions: lessonQuestionsForMp(1),
  },
  {
    id: 'warrior_cleave',
    classType: 'warrior',
    levelRequirement: 2,
    label: 'Cleave',
    mpCost: 2,
    baseDamage: 26,
    secondaryGain: 4,
    effects: [],
    description: 'A wide swing that builds Rage.',
    lessonQuestions: lessonQuestionsForMp(2),
  },
  {
    id: 'warrior_reckless_strike',
    classType: 'warrior',
    levelRequirement: 3,
    label: 'Reckless Strike',
    mpCost: 2,
    baseDamage: 44,
    secondaryGain: 5,
    effects: [],
    description: 'An all-out blow that builds heavy Rage.',
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
    description: 'Brace yourself, reducing incoming counter damage by 60% this turn. Spends Rage.',
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
    baseDamage: 48,
    secondaryCost: 5,
    effects: [],
    description: 'A heavy shield bash. Spends Rage.',
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
    description: 'Roar to empower your next attack for 1.6× damage. Spends Rage.',
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
    baseDamage: 130,
    secondaryCost: 10,
    effects: [],
    description: 'A finishing blow for massive damage. Spends Rage.',
    lessonQuestions: lessonQuestionsForMp(4),
  },

  // ── Priest (mana + faith): sustain ─────────────────────────────
  {
    id: 'priest_smite',
    classType: 'priest',
    levelRequirement: 1,
    label: 'Smite',
    mpCost: 1,
    baseDamage: 12,
    secondaryGain: 2,
    effects: [],
    description: 'A holy strike that builds Faith.',
    lessonQuestions: lessonQuestionsForMp(1),
  },
  {
    id: 'priest_holy_bolt',
    classType: 'priest',
    levelRequirement: 2,
    label: 'Holy Bolt',
    mpCost: 2,
    baseDamage: 26,
    secondaryGain: 3,
    effects: [],
    description: 'A bolt of light that builds Faith.',
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
    description: 'Channel light to heal yourself for 25 HP. Spends Faith.',
    lessonQuestions: lessonQuestionsForMp(2),
    soloAdjustmentNote: 'Originally heals an ally. In solo, heals self for 25 HP.',
  },
  {
    id: 'priest_radiant_strike',
    classType: 'priest',
    levelRequirement: 4,
    label: 'Radiant Strike',
    mpCost: 3,
    baseDamage: 48,
    secondaryGain: 4,
    effects: [],
    description: 'A radiant attack that builds Faith.',
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
    description: 'A powerful prayer that heals you for 55 HP. Spends Faith.',
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
    description: 'A holy barrier that blocks all counter damage this turn. Spends Faith.',
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
    baseDamage: 95,
    secondaryCost: 10,
    effects: [{ kind: 'self_heal', amount: 20 }],
    description: 'Divine wrath that also heals you for 20 HP. Spends Faith.',
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
