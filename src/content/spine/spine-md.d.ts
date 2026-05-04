// Ambient module declaration for spine markdown imports.
// The vite plugin in vite.config.ts transforms these into typed JSON at build time.
declare module '*.md' {
  import type { SpineEntry } from './parser';
  const value: SpineEntry[];
  export default value;
}
