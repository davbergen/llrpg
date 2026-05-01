# Issues: Vite + React + TypeScript migration

Vertical slices derived from [PRD.md](PRD.md). Each slice is a tracer bullet — it cuts end-to-end through the migration so the app remains runnable (or becomes runnable) at each step.

---

## #1 — Scaffold Vite + React + TS project

**Type:** AFK

## Parent

[PRD.md](PRD.md)

## What to build

Run `npm create vite@latest .` against the existing directory using the `react-ts` template, choosing "ignore existing files" so the current `.jsx` files survive on disk for later porting. Confirm the untouched Vite template is fully functional before any porting begins. This establishes the build, type-check, lint, and preview pipeline as a baseline.

## Acceptance criteria

- [ ] `package.json` exists with `dev`, `build`, `preview`, `lint` scripts (Vite defaults)
- [ ] `tsconfig.json` and `tsconfig.node.json` present (Vite defaults)
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `.vite/`, plus `uploads/` and OS/editor cruft (`.DS_Store`, `Thumbs.db`, `.idea/`, `.vscode/` if not project-shared)
- [ ] ESLint preconfigured at Vite default
- [ ] `npm install` succeeds
- [ ] `npm run dev` starts cleanly and serves the Vite template at `http://localhost:5173` with no console errors
- [ ] `npx tsc --noEmit` exits clean
- [ ] `npm run lint` exits clean
- [ ] `npm run build && npm run preview` produces a working bundle
- [ ] Existing `.jsx` files and `Language RPG.html` are still on disk (untouched)

## Blocked by

None — can start immediately.

---

## #2 — Port RPG primitives, shared types, constants, App shell, and Home screen

**Type:** AFK

## Parent

[PRD.md](PRD.md)

## What to build

First real tracer bullet through the new stack. Establish the shared module surface (`types.ts`, `constants.ts`, RPG primitives) and port the `App` shell + `Home` screen end-to-end so the migrated app renders a real screen with the original visual design. To keep this slice runnable without onboarding, `App` boots directly into the Home screen (a stub `hero` is set in initial state); onboarding is restored in #3.

Preserve the inline `style={{...}}` objects 1:1 — no styling refactor. Preserve the 390×720 phone frame, 150ms fade transition scaffolding, Google Fonts preload, and global CSS reset/scrollbar/font-smoothing rules in `index.html`.

## Acceptance criteria

- [ ] `src/types.ts` exports `Hero`, `GameState`, `Tweaks`, `ScreenName`, `ClassType`, `ScreenProps`
- [ ] `ClassType = 'mage' | 'warrior' | 'rogue'`, `ScreenName = 'onboarding' | 'home' | 'lesson' | 'loot' | 'profile'`, `Tweaks.panelStyle = 'dark' | 'warm' | 'cool'`
- [ ] `src/constants.ts` exports typed `INITIAL_STATE` and `TWEAK_DEFAULTS` (no `EDITMODE-BEGIN/END` markers)
- [ ] `src/components/rpg/` contains the `RPG` palette, `pixelBorderStyle()`, and shared visual primitives (`PixelPanel`, `PixelHeader`, `NavBar`, etc.) — all imported via ES modules
- [ ] `src/screens/Home.tsx` is a 1:1 port of the existing Home screen, typed as `React.FC<ScreenProps>`
- [ ] `src/App.tsx` owns `screen`, `hero`, `gameState`, `tweaks` state; renders the phone-frame chrome; boots into Home with a stub hero
- [ ] `index.html` preserves the Google Fonts (`Press Start 2P`, `Courier Prime`) preconnect + stylesheet and the global CSS reset, scrollbar, and font-smoothing rules
- [ ] No `import` from `@babel/standalone` or unpkg anywhere
- [ ] Phone frame renders at 390×720, scaled to fit the window
- [ ] Home screen is visually identical to the build-less prototype
- [ ] `npx tsc --noEmit` and `npm run lint` exit clean
- [ ] `npm run dev` shows Home with no console errors

## Blocked by

- Blocked by #1

---

## #3 — Port Onboarding screen and wire as initial screen

**Type:** AFK

## Parent

[PRD.md](PRD.md)

## What to build

Port `Onboarding.tsx` and restore `screen='onboarding'` as the initial state in `App`. The Onboarding screen accepts a screen-specific prop interface (not full `ScreenProps`) — it needs to set `hero` on completion and navigate to Home. Remove the temporary stub-hero shortcut introduced in #2.

## Acceptance criteria

- [ ] `src/screens/Onboarding.tsx` ports the existing onboarding UI 1:1
- [ ] User can pick a class (`mage` / `warrior` / `rogue`), set a name, and click "Begin"
- [ ] On "Begin", `App` sets `hero = { name, classType }` and navigates to Home with the 150ms fade
- [ ] App boots into Onboarding by default; stub-hero shortcut from #2 is removed
- [ ] `npx tsc --noEmit` and `npm run lint` exit clean
- [ ] Onboarding → Home flow works end-to-end with no console errors

## Blocked by

- Blocked by #2

---

## #4 — Port Lesson, Loot, Profile screens and bottom nav routing

**Type:** AFK

## Parent

[PRD.md](PRD.md)

## What to build

Port the remaining three screens and wire the bottom `NavBar` so all four post-onboarding screens are reachable. Preserve the 150ms fade transition between screen swaps. Each screen is `React.FC<ScreenProps>` and a 1:1 visual port.

## Acceptance criteria

- [ ] `src/screens/Lesson.tsx`, `src/screens/Loot.tsx`, `src/screens/Profile.tsx` ported 1:1
- [ ] Bottom nav switches between Home, Lesson, Loot, Profile
- [ ] All four screens render without console errors
- [ ] Screen transitions show a ~150ms fade
- [ ] `gameState` is shared across screens via the `App`-owned state (no regressions in HP/MP/XP/level/gold/streak/quests/party/inventory display)
- [ ] `npx tsc --noEmit` and `npm run lint` exit clean

## Blocked by

- Blocked by #2

(Can run in parallel with #3.)

---

## #5 — Port Tweaks panel with keyboard-shortcut toggle, drop postMessage protocol

**Type:** HITL

## Parent

[PRD.md](PRD.md)

## What to build

Port the Tweaks panel and its form-control vocabulary (`TweakSection`, `TweakSlider`, `TweakRadio`, `TweakColor`, `TweakToggle`, `TweakButton`) to `src/tweaks/`. Replace the host-iframe activation flow with a keyboard shortcut wired in `App`. Drop all `postMessage` plumbing and the `EDITMODE-BEGIN/END` markers.

**HITL decision required before implementation:** which keyboard shortcut toggles the panel? (e.g. `Cmd/Ctrl+.`, backtick, `?`, `Cmd/Ctrl+K`.)

## Acceptance criteria

- [ ] Keyboard shortcut decision recorded in the issue/PR description
- [ ] `src/tweaks/` contains the panel and all form controls
- [ ] Panel toggles open/closed via the chosen keyboard shortcut
- [ ] Every control updates `tweaks` state and re-renders affected components live
- [ ] No references to `__edit_mode_available`, `__edit_mode_set_keys`, `__edit_mode_dismissed`, `__activate_edit_mode`, `__deactivate_edit_mode`, or `EDITMODE-BEGIN/END` anywhere in the codebase
- [ ] No `window.parent.postMessage` calls related to edit mode
- [ ] `npx tsc --noEmit` and `npm run lint` exit clean

## Blocked by

- Blocked by #2

(Can run in parallel with #3 and #4.)

---

## #6 — Add Prettier config + format script, run across codebase

**Type:** AFK

## Parent

[PRD.md](PRD.md)

## What to build

Add Prettier with a minimal `.prettierrc` (`semi: true, singleQuote: true, printWidth: 100`), expose a `format` npm script, and run it once across the migrated codebase so the initial commit is already formatted. This is sequenced last among the porting slices so the format pass covers everything.

## Acceptance criteria

- [ ] `prettier` added as a dev dependency
- [ ] `.prettierrc` present with `semi: true, singleQuote: true, printWidth: 100`
- [ ] `format` npm script in `package.json` runs Prettier across the codebase
- [ ] `npm run format` succeeds and leaves the tree formatted
- [ ] `npx tsc --noEmit` and `npm run lint` still exit clean after formatting

## Blocked by

- Blocked by #2, #3, #4, #5

---

## #7 — Delete legacy files, write README, rewrite CLAUDE.md

**Type:** AFK

## Parent

[PRD.md](PRD.md)

## What to build

Remove the pre-migration build-less prototype files now that the port is complete, write a short `README.md`, and rewrite `CLAUDE.md` to describe the new architecture. The new `CLAUDE.md` must explicitly note that the host-iframe edit-mode protocol has been removed, so future Claude sessions don't reintroduce it from memory of the old file.

## Acceptance criteria

- [ ] Deleted: `Language RPG.html`, `rpg-components.jsx`, `screens-onboarding.jsx`, `screens-home.jsx`, `screens-lesson.jsx`, `screens-loot.jsx`, `screens-profile.jsx`, `tweaks-panel.jsx`, `ios-frame.jsx`
- [ ] `README.md` present with a one-paragraph project description and the run command (`npm install && npm run dev`)
- [ ] `CLAUDE.md` rewritten to describe: Vite + React + TS, ES modules, `src/` layout map (`src/components/`, `src/screens/`, `src/tweaks/`), keyboard-shortcut toggle for Tweaks panel, and an explicit note that the host-iframe `postMessage` edit-mode protocol has been removed
- [ ] No reference to `EDITMODE-BEGIN/END`, `python -m http.server`, or `@babel/standalone` in `CLAUDE.md` or `README.md`
- [ ] `npm run dev`, `npx tsc --noEmit`, `npm run lint`, `npm run build && npm run preview` all still pass

## Blocked by

- Blocked by #3, #4, #5

---

## #8 — Initialize git repo and create initial commit

**Type:** HITL

## Parent

[PRD.md](PRD.md)

## What to build

Initialize a local-only git repo and create the single initial commit capturing the entire migrated state. No GitHub remote is created. HITL because the user should authorize the commit and confirm `.gitignore` coverage before the baseline is locked in.

## Acceptance criteria

- [ ] User confirms `.gitignore` covers `node_modules/`, `dist/`, `.vite/`, `uploads/`, and OS/editor cruft before commit
- [ ] `git init` run in project root
- [ ] All migrated files staged
- [ ] Single initial commit created with a clear message (e.g. `Initial commit: Vite + React + TypeScript migration of LinguaQuest prototype`)
- [ ] `git log` shows exactly one commit
- [ ] `git status` is clean
- [ ] No GitHub remote configured

## Blocked by

- Blocked by #1, #2, #3, #4, #5, #6, #7
