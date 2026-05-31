import { defineConfig, configDefaults } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { parseSpine, type SpineFileType } from './src/content/spine/parser';

const SPINE_FILE_TYPES: Record<string, SpineFileType> = {
  'vocab.md': 'vocab',
  'grammar.md': 'grammar',
  'kanji.md': 'kanji',
};

function spineMarkdownPlugin(): Plugin {
  const normalize = (id: string) => id.replace(/\\/g, '/');
  const isSpineMd = (id: string) =>
    normalize(id).includes('/src/content/spine/') && id.endsWith('.md');
  const fileTypeFor = (id: string): SpineFileType | undefined => {
    const base = normalize(id).split('/').pop() ?? '';
    return SPINE_FILE_TYPES[base];
  };

  return {
    name: 'spine-markdown',
    enforce: 'pre',
    load(id) {
      if (!isSpineMd(id)) return null;
      const text = readFileSync(id, 'utf8');
      const entries = parseSpine(text, { fileType: fileTypeFor(id) });
      return `export default ${JSON.stringify(entries)};\n`;
    },
    handleHotUpdate(ctx) {
      if (isSpineMd(ctx.file)) {
        return ctx.modules;
      }
      return undefined;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), spineMarkdownPlugin()],
  test: {
    // The balance gate runs via its own config (`npm run sim`), not the unit run.
    exclude: [...configDefaults.exclude, 'src/sim/dungeons.sim.test.ts'],
  },
});
