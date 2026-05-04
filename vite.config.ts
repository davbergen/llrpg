import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { parseSpine } from './src/content/spine/parser';

function spineMarkdownPlugin(): Plugin {
  const isSpineMd = (id: string) =>
    id.replace(/\\/g, '/').includes('/src/content/spine/') && id.endsWith('.md');

  return {
    name: 'spine-markdown',
    enforce: 'pre',
    load(id) {
      if (!isSpineMd(id)) return null;
      const text = readFileSync(id, 'utf8');
      const entries = parseSpine(text);
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
  plugins: [react(), spineMarkdownPlugin()],
});
