# PRD: Init the Language RPG project (Vite + React + TypeScript migration)

## Problem Statement

I have a working Japanese-learning RPG prototype ("LinguaQuest") sitting in `C:\Users\david\dev\Language RPG`, but it's a build-less browser experiment: React 18 and `@babel/standalone` loaded from unpkg via `<script>` tags, JSX transpiled in the browser at runtime, served via `python -m http.server`. There is no `package.json`, no git repo, no module system, no type checking, no production build path.

I plan to expand this into a full app. In its current shape that's painful:

- Every component lives in one global scope, with script load order maintained as a manual contract inside `Language RPG.html`.
- `@babel/standalone` is ~3MB and transpiles on every page load — unusable in production.
- There are no `import`/`export` statements anywhere, so adding TypeScript, routing, state management, or testing later means retrofitting modules across every file I've added in the meantime.
- The `gameState` blob is passed around untyped; refactor safety is zero.
- There is no version control — no history, no branching, no recoverability.

The migration cost only goes up from here. I want to do it now, while the codebase is small (~7 files).

## Solution

Convert the prototype in place into a real Vite + React + TypeScript project, initialize a local git repo, and provide a one-command local dev workflow.

After this work, `npm install && npm run dev` opens the app at `http://localhost:5173` with hot module reload, the existing screens and tweaks panel behave identically, all props are typed, ESLint and Prettier are wired in, and `git log` shows an initial commit with the ported codebase.

The Tweaks panel UI is preserved but the host-iframe `postMessage` protocol (`__edit_mode_*` events and the `EDITMODE-BEGIN/END` markers) is dropped — I have only opened the host design tool once and don't use it. The panel becomes a standalone dev affordance toggled by a keyboard shortcut.

## User Stories

1. As a developer, I want a `package.json` with declared dependencies, so that I can reproduce the project on another machine without remembering which unpkg URLs to paste.
2. As a developer, I want `npm run dev` to start a local dev server, so that I have a single canonical command instead of remembering `python -m http.server` and the URL-encoded path.
3. As a developer, I want hot module reload, so that edits to a screen file reflect in the browser within a fraction of a second without a full page refresh.
4. As a developer, I want TypeScript type checking, so that renaming a `gameState` field surfaces every consumer instead of failing silently at runtime.
5. As a developer, I want shared types (`Hero`, `GameState`, `Tweaks`, `ScreenName`, `ClassType`, `ScreenProps`) defined once and imported everywhere, so that the screen contracts are explicit and discoverable.
6. As a developer, I want real ES modules with `import`/`export`, so that I can move and rename files without manually maintaining script load order in HTML.
7. As a developer, I want a `src/` directory with screens grouped under `src/screens/`, components under `src/components/`, and tweaks under `src/tweaks/`, so that the project root stays readable as the app grows.
8. As a developer, I want PascalCase component filenames (`Home.tsx`, `Lesson.tsx`), so that the file naming matches the React community convention.
9. As a developer, I want a `.gitignore` that excludes `node_modules/`, `dist/`, `.vite/`, the existing `uploads/` screenshot folder, and OS/editor cruft, so that the first commit doesn't drag in build artifacts or local-only files.
10. As a developer, I want ESLint preconfigured (Vite default), so that obvious mistakes like unused variables and missing dependency arrays are flagged.
11. As a developer, I want Prettier preconfigured with a project `.prettierrc`, so that formatting is consistent across files and a future "format the whole repo" diff doesn't bury a meaningful change.
12. As a developer, I want a `format` npm script that runs Prettier across the codebase, so that I can normalize a file or the whole tree without remembering the command.
13. As a developer, I want a `build` npm script that produces a deployable static bundle, so that I have a path to production from day one.
14. As a developer, I want a `preview` npm script that serves the production build locally, so that I can sanity-check the bundle before considering it deployable.
15. As a developer, I want `tsc --noEmit` to pass on the migrated codebase, so that the TypeScript safety net is real on day one rather than aspirational.
16. As a developer, I want the existing visual design (palette, pixel borders, fonts, frame chrome) to render identically to the build-less prototype after migration, so that I'm verifying the migration, not redesigning.
17. As a developer, I want the Onboarding → Home → (Lesson | Loot | Profile) navigation flow to work end-to-end after migration, so that I can confirm the port preserved app behavior.
18. As a developer, I want the Tweaks panel UI preserved, so that I keep the live design-token tuning ergonomic during development.
19. As a developer, I want the Tweaks panel toggled by a keyboard shortcut in standalone mode, so that I don't lose access to it now that the host-iframe activation message is gone.
20. As a developer, I want the `postMessage` host-iframe protocol (`__edit_mode_available`, `__edit_mode_set_keys`, `__edit_mode_dismissed`, `__activate_edit_mode`, `__deactivate_edit_mode`) and the `EDITMODE-BEGIN/END` markers removed, so that I'm not maintaining a feature I don't use.
21. As a developer, I want `INITIAL_STATE` and `TWEAK_DEFAULTS` extracted into a shared constants module, so that the `App` component is about composition rather than data.
22. As a developer, I want the unused `ios-frame.jsx` reference artifact dropped from the build, so that the codebase doesn't carry dead weight into the new repo.
23. As a developer, I want a local-only git repo initialized with a single initial commit, so that I have a baseline I can branch from without committing to a GitHub remote yet.
24. As a developer, I want a `README.md` with a one-paragraph description and the run command, so that future-me (or any contributor) gets oriented in 30 seconds.
25. As a developer, I want `CLAUDE.md` rewritten to describe the new architecture (Vite + TS, modules, no host protocol, file layout map), so that Claude Code sessions on this repo aren't operating on stale context.
26. As a developer, I want to delete `Language RPG.html` and the top-level `.jsx` files after the port, so that the repo doesn't ship two copies of the same app.
27. As a player, I want the Onboarding screen to let me pick a class and name and proceed to the home screen, so that the migrated app behaves like the prototype I had before.
28. As a player, I want the bottom nav bar to switch between Home, Lesson, Loot, and Profile, so that all five screens remain reachable.
29. As a player, I want the screen-transition fade (~150ms) preserved, so that the app feels the same as before.
30. As a player, I want the iOS-style phone frame (390×720, scaled to fit the window) preserved, so that the visual context of the prototype is unchanged.
31. As a developer, I want the Google Fonts (`Press Start 2P`, `Courier Prime`) preload retained in `index.html`, so that pixel typography renders correctly on first paint.
32. As a developer, I want the global CSS reset, scrollbar styling, and font-smoothing rules preserved in `index.html`, so that the visual invariants noted in the original `CLAUDE.md` are not lost in the migration.

## Implementation Decisions

**Tooling**

- Migrate to **Vite** with the `react-ts` template. Run `npm create vite@latest .` against the existing directory, choosing "ignore existing files" so the current `.jsx` files survive long enough to be ported.
- Use **TypeScript** from day one. All ported component files become `.tsx`. `tsconfig.json` follows Vite's defaults.
- Use **ESLint** at Vite's default configuration.
- Add **Prettier** with a minimal config (`semi: true, singleQuote: true, printWidth: 100`). Run once across the migrated codebase before the initial commit.
- Defer **Vitest / React Testing Library**. No tests are written in this PRD.

**Module layout (deep modules)**

- **Shared types** is a deep module: a single source of truth (`Hero`, `GameState`, `Tweaks`, `ScreenName`, `ClassType`, `ScreenProps`) imported by every screen and the `App` shell. Its surface is small and stable.
- **Constants** holds `INITIAL_STATE` and `TWEAK_DEFAULTS` as plain typed consts. No `EDITMODE-BEGIN/END` markers.
- **RPG primitives** holds the `RPG` palette, the `pixelBorderStyle()` helper, and shared visual primitives (`PixelPanel`, `PixelHeader`, `NavBar`, etc.). Every screen imports from here.
- **Screens** are leaves: `Onboarding`, `Home`, `Lesson`, `Loot`, `Profile`. One-to-one ports of the existing files. Each is `React.FC<ScreenProps>` (or a screen-specific prop interface for `Onboarding`).
- **Tweaks panel** retains the existing form-control vocabulary (`TweakSection`, `TweakSlider`, `TweakRadio`, `TweakColor`, `TweakToggle`, `TweakButton`). Toggled by a keyboard shortcut in `App`. No `postMessage` plumbing.
- **App shell + entry** owns routing state, screen transition animation, the phone frame chrome, and the keyboard shortcut wiring for the Tweaks panel.

**Folder grouping** is by role (`src/components/`, `src/screens/`, `src/tweaks/`) rather than the current `screens-*.jsx` prefix-grouped flat layout.

**Styling decisions deferred.** Inline `style={{...}}` objects are ported 1:1. Migration to CSS variables / CSS modules / Tailwind is a separate decision, revisited when the first `:hover`/responsive need appears.

**Git** is initialized locally only. No GitHub remote is created in this PRD. A single initial commit captures the entire migrated state. The pre-migration `Language RPG.html` and `.jsx` files are removed in the same commit, since there is no prior history to preserve.

**`ios-frame.jsx`** is dropped. The original `CLAUDE.md` already noted it was unused; the user has it in their working tree if they ever want to revive it.

**Architectural contracts preserved**

- The phone frame stays at 390×720 scaled to fit the window.
- The screen transition stays at 150ms fade.
- Google Fonts (`Press Start 2P`, `Courier Prime`) preconnect + stylesheet in `index.html`.
- Global CSS reset, scrollbar, and font-smoothing rules in `index.html`.
- `ClassType = 'mage' | 'warrior' | 'rogue'`.
- `ScreenName = 'onboarding' | 'home' | 'lesson' | 'loot' | 'profile'`.
- `Tweaks.panelStyle = 'dark' | 'warm' | 'cool'`.

## Testing Decisions

**No automated tests are written in this PRD.** Vitest is deferred until there is testable logic to cover. The current code is overwhelmingly layout, and the migration is a structural port, not a behavior change — automated tests added today would document the port rather than the app, and would need rewriting once domain logic lands.

A good test in this codebase, when tests are eventually added, will:

- Exercise externally observable behavior (a user-visible interaction or a public function's return value), not internal component state or call counts.
- Survive a refactor that preserves behavior.
- Use realistic data shapes (a full `GameState`, not a `Partial<GameState>` that drifts from the type).

When tests come, the natural first targets are the screens (React Testing Library, render + interact + assert on visible output) and any future pure-logic modules around quests, XP/level math, or lesson scoring.

**Verification for this PRD is manual + tooling-driven, not automated:**

- `npm run dev` starts cleanly with no console errors.
- Onboarding → pick class → set name → "Begin" → Home screen renders.
- Bottom nav cycles through Home, Lesson, Loot, Profile, all rendering without errors.
- Tweaks panel opens via the chosen keyboard shortcut, every control updates `tweaks` state and re-renders affected components live.
- `npx tsc --noEmit` exits clean.
- `npm run lint` exits clean.
- `npm run build && npm run preview` produces a working bundle.
- `git log` shows the single initial commit; `git status` is clean.

There is no prior art for tests in this codebase — there are zero tests today.

## Out of Scope

- Creating a GitHub remote, pushing, or filing this PRD as a GitHub issue. The user opted to keep the repo local for now; remote setup happens in a separate follow-up.
- Migrating inline styles to CSS variables, CSS modules, or Tailwind. Deliberately deferred.
- Setting up Vitest, React Testing Library, or any test harness. Deliberately deferred.
- Restoring the host-iframe edit-mode protocol. Deliberately removed.
- Rewriting any screen's content, layout, or game logic. This is a structural port; visual and behavioral parity is the goal.
- Adding routing libraries, state management libraries, or context providers. Current `App`-owned state is preserved as-is.
- Adding `React.StrictMode`. The existing code wasn't designed against double-effects; revisit later.
- Balancing or expanding the game itself (quests, lessons, loot tables, XP curve, party system). Game design work happens after the foundation is in.
- Mobile/responsive layout, accessibility audit, internationalization. Future work.
- CI, deployment pipeline, hosting. Future work.

## Further Notes

- The user has confirmed each decision through interview: migrate now (not later), TypeScript yes, defer styling, `src/` layout with PascalCase, drop the host-iframe protocol, ESLint+Prettier yes, defer tests, local git only.
- `ios-frame.jsx` will be deleted from the working tree as part of the migration. Since git is being initialized fresh, there is no historical preservation — if the user later wants it back, they should copy it elsewhere before the cleanup commit, or rely on filesystem-level recovery.
- `uploads/pasted-1777619869447-0.png` is gitignored; the screenshot is a reference artifact, not source.
- The new `CLAUDE.md` should explicitly note that the host-iframe edit-mode protocol has been removed, so future Claude sessions don't re-introduce it from memory of the old `CLAUDE.md`.
- This PRD lives at `C:\Users\david\dev\Language RPG\PRD.md` rather than as a GitHub issue because `gh` CLI is not installed and no GitHub repo has been created. When the repo is published, this file should be filed as issue #1 (or moved into a `docs/` folder) and removed from the project root.
