// UI sound effects.
//
// Two clips, played through a tiny helper so callers don't touch the Audio API
// directly:
//   - `select`  — the default press feedback for any button.
//   - `confirm` — for buttons that commit a choice (confirm class, finish lesson…).
//
// Vite hashes and bundles the imported mp3s, so this works the same on web and
// inside the Capacitor native webview.
import selectSoundUrl from './assets/sfx/select_sound.mp3';
import confirmSoundUrl from './assets/sfx/confirm_sound.mp3';

export type SfxName = 'select' | 'confirm';

const SOURCES: Record<SfxName, string> = {
  select: selectSoundUrl,
  confirm: confirmSoundUrl,
};

// One preloaded template per clip. We clone it per play so rapid presses overlap
// instead of cutting each other off, while only fetching the file once.
const templates: Partial<Record<SfxName, HTMLAudioElement>> = {};

function template(name: SfxName): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  let el = templates[name];
  if (!el) {
    el = new Audio(SOURCES[name]);
    el.preload = 'auto';
    templates[name] = el;
  }
  return el;
}

export function playSfx(name: SfxName): void {
  const tmpl = template(name);
  if (!tmpl) return;
  const node = tmpl.cloneNode() as HTMLAudioElement;
  node.volume = 0.5;
  // Browsers reject playback before the first user gesture; ignore quietly.
  void node.play().catch(() => {});
}

export const playSelect = (): void => playSfx('select');
export const playConfirm = (): void => playSfx('confirm');
