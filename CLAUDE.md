# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Running the app

```
npm install
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # Production bundle
npm run preview  # Serve the production bundle locally
npm run lint     # ESLint
npm run format   # Prettier
```

## Stack

Vite + React 18 + TypeScript. All source files use ES modules with explicit `import`/`export`. No `@babel/standalone`, no unpkg CDN scripts, no `file://` CORS workarounds.

## Shell gotchas (Windows / PowerShell)

The default shell here is **PowerShell**, but the Bash tool is also available — don't mix their syntaxes.

- **`@'...'@` here-strings are PowerShell-only.** In Bash they are *not* special: the leading `@` becomes a literal character. Passing a commit message via `git commit -m @'...'@` in **Bash** leaks a stray `@` into the message (e.g. a commit titled `@ B1 (#79): ...`). For multi-line commit messages in the Bash tool, use a real heredoc and `-F -`:
  ```sh
  git commit -F - <<'EOF'
  Subject line

  Body.
  EOF
  ```
  Only use `@'...'@` when the command is actually running under PowerShell, and keep the closing `'@` at column 0.
- Per the global shell rules: PowerShell has no `&&`/`||` chaining, no ternary/null-coalescing, and writes UTF-16 files by default — prefer the Bash tool for POSIX-y scripts and the dedicated File/Search tools over `cat`/`grep`/`sed`.

## Architecture

The app is a single-screen iOS-frame prototype of a Japanese-learning RPG ("LinguaQuest"). Everything renders inside a fixed 390×720 phone frame in `index.html`, scaled to fit the window.

### `src/` layout

```
src/
  types.ts                  — shared TypeScript types (Hero, GameState, Tweaks, ScreenName, ClassType, ScreenProps)
  constants.ts              — INITIAL_STATE, TWEAK_DEFAULTS
  App.tsx                   — root component; owns all state and routing
  main.tsx                  — ReactDOM entry point
  components/
    rpg/
      index.tsx             — RPG palette (RPG color object), pixelBorderStyle(), shared primitives
                              (PixelPanel, PixelHeader, NavBar, etc.)
  screens/
    Onboarding.tsx          — name + class picker; navigates to Home on completion
    Home.tsx                — dashboard with HP/MP/XP/streak/quests/party
    Lesson.tsx              — vocabulary lesson flow
    Loot.tsx                — item reward screen
    Profile.tsx             — character stats and inventory
  tweaks/
    index.ts                — re-exports TweaksPanel and all form controls
    TweaksPanel.tsx         — panel shell + TweakSection, TweakSlider, TweakRadio,
                              TweakColor, TweakToggle, TweakButton
```

### App state and routing

`App.tsx` holds all state — no router, no context, no store:

- `screen` — one of `'onboarding' | 'home' | 'lesson' | 'loot' | 'profile'`. `navigate(dest)` triggers a 150ms fade transition before swapping.
- `hero` — `{ name, classType }`, set when onboarding completes; nav bar only renders once `hero` is non-null.
- `gameState` — HP/MP/XP/level/gold/streak/quests/party/inventory; passed to every screen as `ScreenProps`.
- `tweaks` — live design tokens, toggled via the Tweaks panel.

### Tweaks panel

The Tweaks panel opens and closes with **Cmd/Ctrl+.** (period). It is wired entirely inside `App.tsx` via a `keydown` listener — there is no external activation mechanism.

**The host-iframe `postMessage` edit-mode protocol has been permanently removed.** There are no `window.parent.postMessage` calls, no `__edit_mode_available` / `__activate_edit_mode` / `__deactivate_edit_mode` / `__edit_mode_set_keys` / `__edit_mode_dismissed` messages, and no `EDITMODE-BEGIN/END` markers anywhere in the codebase. Do not reintroduce them.

### Visual system

`src/components/rpg/index.tsx` defines the entire look: a fixed palette in the `RPG` constant and a `pixelBorderStyle(color, bg)` helper that fakes pixel-art chrome via `box-shadow`. Typography uses `'Press Start 2P'` (pixel headers) and `'Courier Prime'` (body), preloaded from Google Fonts in `index.html`. Global CSS in `index.html` disables font smoothing on `*` and re-enables it on `p, span, div` — keep that invariant when adding text.
