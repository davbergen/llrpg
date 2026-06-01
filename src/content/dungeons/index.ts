import templatesMd from './templates.md?raw';
import dungeon1Md from './dungeon-1.md?raw';
import dungeon2Md from './dungeon-2.md?raw';
import dungeon3Md from './dungeon-3.md?raw';
import dungeon4Md from './dungeon-4.md?raw';
import dungeon5Md from './dungeon-5.md?raw';
import dungeon6Md from './dungeon-6.md?raw';
import dungeon7Md from './dungeon-7.md?raw';
import dungeon8Md from './dungeon-8.md?raw';
import {
  parseTemplates,
  parseDungeon,
  type ParsedDungeon,
  type MonsterTemplate,
} from './parser';

export type { ParsedDungeon, MonsterTemplate } from './parser';

const TEMPLATES: MonsterTemplate[] = parseTemplates(templatesMd);
const TEMPLATES_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export const DUNGEONS: ParsedDungeon[] = [
  parseDungeon(dungeon1Md, TEMPLATES_BY_ID),
  parseDungeon(dungeon2Md, TEMPLATES_BY_ID),
  parseDungeon(dungeon3Md, TEMPLATES_BY_ID),
  parseDungeon(dungeon4Md, TEMPLATES_BY_ID),
  parseDungeon(dungeon5Md, TEMPLATES_BY_ID),
  parseDungeon(dungeon6Md, TEMPLATES_BY_ID),
  parseDungeon(dungeon7Md, TEMPLATES_BY_ID),
  parseDungeon(dungeon8Md, TEMPLATES_BY_ID),
].sort((a, b) => a.meta.order - b.meta.order);

export const DUNGEONS_BY_ID = new Map(DUNGEONS.map((d) => [d.meta.id, d]));

export function getDungeon(id: string): ParsedDungeon {
  const d = DUNGEONS_BY_ID.get(id);
  if (!d) throw new Error(`unknown dungeon id "${id}"`);
  return d;
}
