import templatesMd from './templates.md?raw';
import dungeon1Md from './dungeon-1.md?raw';
import dungeon2Md from './dungeon-2.md?raw';
import dungeon3Md from './dungeon-3.md?raw';
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
].sort((a, b) => a.meta.order - b.meta.order);

export const DUNGEONS_BY_ID = new Map(DUNGEONS.map((d) => [d.meta.id, d]));

export function getDungeon(id: string): ParsedDungeon {
  const d = DUNGEONS_BY_ID.get(id);
  if (!d) throw new Error(`unknown dungeon id "${id}"`);
  return d;
}
