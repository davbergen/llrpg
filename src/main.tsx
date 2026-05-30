import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { isNative } from './platform';

/**
 * Boot the app. On native, Preferences is async-only, so we hydrate the storage
 * cache (and run the one-time `localStorage` → Preferences migration) before
 * first render. `App` is imported dynamically *after* hydration so that no
 * module-scope storage read — `loadLocalSync`, the FSRS card-store singleton —
 * runs against a cold cache. On web, hydration is skipped and the synchronous
 * `loadLocalSync` boot path is unchanged.
 */
async function boot() {
  if (isNative()) {
    const { preferencesStorage, runOneTimeMigration } = await import('./repos/preferencesStorage');
    await preferencesStorage.hydrate();
    await runOneTimeMigration(preferencesStorage);
  }

  const { default: App } = await import('./App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
