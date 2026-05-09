import type { Monster } from '../../types';

export interface MonsterTemplate {
  id: string;
  sprite: string;
  baseHp: number;
  counterDmg: number;
  goldMin: number;
  goldMax: number;
  itemDropChance: number;
}

export interface DungeonMeta {
  id: string;
  name: string;
  sprite: string;
  order: number;
  unlocksFrom: string | null;
}

export interface ParsedDungeon {
  meta: DungeonMeta;
  monsters: Monster[];
}

interface RawBlock {
  fields: Record<string, string>;
}

function stripQuotes(s: string): string {
  if (s.length >= 2 && (s[0] === '"' || s[0] === "'") && s[s.length - 1] === s[0]) {
    return s.slice(1, -1);
  }
  return s;
}

function parseBlocks(text: string): RawBlock[] {
  const stripped = text.replace(/<!--[\s\S]*?-->/g, '');
  const lines = stripped.split('\n');
  const blocks: RawBlock[] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (line.trim() === '---') {
      if (current === null) {
        current = [];
      } else {
        const fields: Record<string, string> = {};
        for (const raw of current) {
          const t = raw.trim();
          if (!t || t.startsWith('#')) continue;
          const m = t.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
          if (!m) throw new Error(`cannot parse line "${raw}"`);
          fields[m[1]] = stripQuotes(m[2].trim());
        }
        blocks.push({ fields });
        current = null;
      }
      continue;
    }
    if (current !== null) current.push(line);
  }
  if (current !== null) throw new Error('unterminated block');
  return blocks;
}

function num(value: string | undefined, fieldName: string, blockIndex: number): number {
  if (value === undefined || value === '') {
    throw new Error(`block ${blockIndex}: missing required numeric field "${fieldName}"`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`block ${blockIndex}: field "${fieldName}" is not a number ("${value}")`);
  }
  return n;
}

function str(value: string | undefined, fieldName: string, blockIndex: number): string {
  if (!value) {
    throw new Error(`block ${blockIndex}: missing required field "${fieldName}"`);
  }
  return value;
}

function optionalNum(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseTemplates(text: string): MonsterTemplate[] {
  const blocks = parseBlocks(text);
  return blocks.map((block, i) => ({
    id: str(block.fields.id, 'id', i),
    sprite: str(block.fields.sprite, 'sprite', i),
    baseHp: num(block.fields.baseHp, 'baseHp', i),
    counterDmg: num(block.fields.counterDmg, 'counterDmg', i),
    goldMin: num(block.fields.goldMin, 'goldMin', i),
    goldMax: num(block.fields.goldMax, 'goldMax', i),
    itemDropChance: num(block.fields.itemDropChance, 'itemDropChance', i),
  }));
}

export function parseDungeon(
  text: string,
  templates: ReadonlyMap<string, MonsterTemplate>,
): ParsedDungeon {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) throw new Error('dungeon file is empty');

  const head = blocks[0];
  if (head.fields.kind !== 'dungeon') {
    throw new Error('first block must be kind: dungeon');
  }
  const meta: DungeonMeta = {
    id: str(head.fields.id, 'id', 0),
    name: str(head.fields.name, 'name', 0),
    sprite: str(head.fields.sprite, 'sprite', 0),
    order: num(head.fields.order, 'order', 0),
    unlocksFrom: head.fields.unlocksFrom ? head.fields.unlocksFrom : null,
  };

  const monsters: Monster[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.fields.kind === 'monster') {
      const templateId = str(b.fields.template, 'template', i);
      const tpl = templates.get(templateId);
      if (!tpl) throw new Error(`block ${i}: unknown template "${templateId}"`);
      const hpMult = b.fields.hpMultiplier !== undefined ? Number(b.fields.hpMultiplier) : 1;
      const counterMult =
        b.fields.counterMultiplier !== undefined ? Number(b.fields.counterMultiplier) : 1;
      const name = b.fields.name ?? templateId;
      monsters.push({
        id: `${meta.id}__${i}__${templateId}`,
        name,
        emoji: tpl.sprite,
        maxHp: Math.round(tpl.baseHp * hpMult),
        isBoss: false,
        counterDamage: Math.round(tpl.counterDmg * counterMult),
        loot: {
          goldMin: tpl.goldMin,
          goldMax: tpl.goldMax,
          itemDropChance: tpl.itemDropChance,
        },
      });
    } else if (b.fields.kind === 'boss') {
      monsters.push({
        id: str(b.fields.id, 'id', i),
        name: str(b.fields.name, 'name', i),
        emoji: str(b.fields.sprite, 'sprite', i),
        maxHp: num(b.fields.maxHp, 'maxHp', i),
        isBoss: true,
        counterDamage: num(b.fields.counterDmg, 'counterDmg', i),
        loot: {
          goldMin: num(b.fields.goldMin, 'goldMin', i),
          goldMax: num(b.fields.goldMax, 'goldMax', i),
          itemDropChance: num(b.fields.itemDropChance, 'itemDropChance', i),
          guaranteedItem: b.fields.guaranteedItem === 'true',
        },
        regenPerTurn: optionalNum(b.fields.regenPerTurn),
        enrageBelowPct: optionalNum(b.fields.enrageBelowPct),
        enrageCounterMultiplier: optionalNum(b.fields.enrageCounterMultiplier),
      });
    } else {
      throw new Error(`block ${i}: unknown kind "${b.fields.kind ?? '<missing>'}"`);
    }
  }

  return { meta, monsters };
}
