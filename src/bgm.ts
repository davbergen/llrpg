// Background music.
//
// A single looping track ("oldschool") played quietly under everything. Like
// `sfx.ts`, the mp3 is imported so Vite hashes and bundles it for both web and
// the Capacitor native webview.
//
// Browsers (and the native webview) block audio until the first user gesture, so
// `startBgm()` attempts playback immediately and, if rejected, retries once on
// the first pointer/key/touch event.
import bgmUrl from './assets/oldschool.mp3';

const MUTE_KEY = 'lrpg.bgm.muted';

let audio: HTMLAudioElement | null = null;
let started = false;
let muted = readMutedPref();

function readMutedPref(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

function element(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!audio) {
    audio = new Audio(bgmUrl);
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = 'auto';
  }
  return audio;
}

// Begin (or resume) the loop. Safe to call repeatedly; only the first call has
// any effect. If the browser blocks autoplay, we arm a one-shot gesture listener
// and try again the moment the user interacts.
export function startBgm(): void {
  if (started || muted) return;
  const el = element();
  if (!el) return;

  const play = () => {
    void el.play().then(
      () => {
        started = true;
      },
      () => {
        // Autoplay blocked — wait for the first user gesture, then retry.
        armGestureUnlock();
      },
    );
  };

  play();
}

let unlockArmed = false;
function armGestureUnlock(): void {
  if (unlockArmed) return;
  unlockArmed = true;
  const events: Array<keyof DocumentEventMap> = ['pointerdown', 'keydown', 'touchstart'];
  const onGesture = () => {
    const el = element();
    if (el) {
      void el.play().then(() => {
        started = true;
      });
    }
    events.forEach((e) => window.removeEventListener(e, onGesture));
    unlockArmed = false;
  };
  events.forEach((e) => window.addEventListener(e, onGesture, { once: true }));
}

export function stopBgm(): void {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  started = false;
}

export function isBgmMuted(): boolean {
  return muted;
}

// Toggle the persisted mute preference. Unmuting starts the loop (respecting the
// autoplay-unlock fallback); muting stops it.
export function setBgmMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? 'true' : 'false');
  } catch {
    // Storage unavailable (private mode) — preference just won't persist.
  }
  if (value) {
    stopBgm();
  } else {
    startBgm();
  }
}
