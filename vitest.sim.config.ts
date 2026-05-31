import { defineConfig } from 'vitest/config';

// Dedicated config for the balance gate (`npm run sim`). Kept separate from the
// default unit-test run so `npm test` stays green while the balance bands are
// still being tuned. `?raw` markdown imports resolve via Vite core (no plugins
// needed for the pure-engine sim path).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/sim/dungeons.sim.test.ts'],
    exclude: ['**/node_modules/**', 'android/**'],
  },
});
