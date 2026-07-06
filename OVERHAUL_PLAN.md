# Visual Overhaul Plan — Futuristic Minimal Casino

A complete redesign of **Mnemonica Trainer**: multiple color themes, tasteful
motion, and synthesized sound effects — wrapped in a **futuristic, minimal
casino** aesthetic that is easy on the eyes.

This document is written so a coding agent (Composer) or a human can execute it
end‑to‑end. The first pass has already been implemented on this branch; the plan
also serves as the design spec and a checklist for further polish.

> **Reference images:** the requester referenced two images ("I like the lighting
> and style of both of those images"). They were **not available** in the build
> environment, so the visual direction below is derived from the written brief:
> deep, moody, low‑key lighting; a single confident neon accent + warm gold;
> glass surfaces; soft ambient glows; generous negative space. If the images
> differ, adjust the palette tokens in `frontend/src/index.css` (see
> [Theme tokens](#3-theme-system)) — nothing else needs to change.

---

## 0. Design language

**Mood:** a high‑end, near‑dark lounge. One dominant neon accent glows against
near‑black; warm gold is the secondary "chips & trim" color. Surfaces are
frosted glass with hairline borders. Motion is smooth and physical, never busy.

**Principles**

- **Easy on the eyes.** Dark, desaturated backgrounds; text at ~85–90% white,
  never pure `#fff` on pure `#000`. Accents glow rather than blast.
- **Minimal.** Few colors per screen. Whitespace does the work. No skeuomorphic
  felt textures — just light and glass.
- **Futuristic.** Wide letter‑spacing on labels, tabular/uppercase numerals,
  thin luminous borders, subtle scanline/vignette ambience.
- **One accent, one gold.** Themes only swap the color scheme; layout, spacing,
  and motion are identical across themes.
- **Respect the user.** Honor `prefers-reduced-motion` and expose explicit
  toggles for motion and sound. All animations are interruptible/idempotent.

**Type**

- Headings & numerals: system font, `text-transform: uppercase` for section
  labels, `letter-spacing`, `font-variant-numeric: tabular-nums` for stats.
- Body: the existing system stack. (Optional future step: self‑host a display
  font such as *Rajdhani*/*Orbitron* as `woff2` under `public/fonts` and add
  `@font-face`; kept out of scope to preserve the zero‑binary, offline‑first
  build. Wire it via `--font-display` if desired.)

---

## 1. Scope & constraints

- **Stack:** React 18 + Vite + TypeScript, single global `frontend/src/index.css`.
- **Offline‑first PWA, $0 hosting.** Do **not** add runtime network deps
  (e.g. Google Fonts) or large binary assets. **Sound is synthesized at runtime
  via the Web Audio API** — zero audio files to cache.
- **Must keep green:** `npm run lint` (`tsc --noEmit`) and `npm run test`
  (`scripts/selftest.ts`). The self‑tests cover pure logic only; the redesign
  must not change any data/logic modules’ signatures.
- **Persistence:** new preferences live in `AppSettings` (Dexie). The repository
  already merges missing fields onto `DEFAULT_SETTINGS`, so old installs migrate
  transparently — just add defaults.

---

## 2. File map (what changes / what is new)

**New**

- `frontend/src/theme/themes.ts` — theme registry (id, label, description,
  swatches, browser `theme-color`).
- `frontend/src/theme/ThemeContext.tsx` — applies `data-theme` + `data-motion`
  to `<html>`, updates the `theme-color` meta, persists via settings.
- `frontend/src/audio/soundEngine.ts` — Web Audio synth singleton (SFX,
  enable/volume, first‑gesture unlock).
- `frontend/src/audio/useSound.ts` — thin hook returning `play(name)` bound to
  settings.

**Edited**

- `frontend/src/db/types.ts` — add `theme`, `soundEnabled`, `soundVolume`,
  `reducedMotion` to `AppSettings`.
- `frontend/src/db/defaults.ts` — defaults for the above.
- `frontend/src/db/repository.ts` — merge new fields (back‑compat).
- `frontend/src/index.css` — full restyle: token system, per‑theme color blocks,
  glass surfaces, ambient background, animations, reduced‑motion gate.
- `frontend/src/main.tsx` — wrap app in `ThemeProvider`; init sound.
- `frontend/src/App.tsx` — route transition wrapper, animated nav indicator,
  nav tap sounds.
- `frontend/src/features/training/TrainingRunner.tsx` — correct/wrong/reveal/win
  sounds + feedback motion classes.
- `frontend/src/features/training/inputs.tsx` — keypad/picker press feedback +
  ticks.
- `frontend/src/features/deck/DeckPage.tsx` — swipe/deal sound + glow.
- `frontend/src/features/stats/SessionSummary.tsx` — count‑up + win flourish.
- `frontend/src/features/settings/SettingsPage.tsx` — Appearance section (theme
  picker + sound/motion toggles + volume).
- `frontend/src/features/home/HomePage.tsx` — hero polish + count‑ups.
- `frontend/index.html` & `frontend/vite.config.ts` — default `theme-color`.

---

## 3. Theme system

**Approach:** CSS custom properties, switched by a `data-theme` attribute on
`<html>`. Structural tokens (radius, spacing, easing, blur) live in `:root`.
Color tokens are defined once per theme in `[data-theme="…"]` blocks in
`index.css`, with `:root` defaulting to the primary theme so there is **no FOUC
before JS runs**. `themes.ts` holds only metadata for the picker UI and the
browser chrome color.

**Token contract** (every theme sets these):

```
--bg-base            /* page background base color            */
--bg-grad-1          /* ambient radial glow A (rgba/hsla)      */
--bg-grad-2          /* ambient radial glow B                  */
--surface            /* glass panel background (translucent)   */
--surface-2          /* raised control background              */
--surface-3          /* pressed/inset background                */
--border             /* hairline border                        */
--text               /* primary text (~90% luminance)          */
--text-dim           /* secondary text                         */
--text-faint         /* tertiary/labels                        */
--accent             /* primary neon                           */
--accent-2           /* gold / warm secondary                  */
--accent-contrast    /* text on accent fills                   */
--good --bad --warn  /* status colors, tuned per theme         */
```

Glows/soft fills derive from `--accent` with `color-mix(...)` (already used in
the codebase) so themes never need separate rgba tokens.

**Themes** (all dark, low‑key, easy on the eyes — color only):

1. **Neon Noir** *(default — the futuristic minimal casino)* — aqua‑cyan accent
   + gold on near‑black.
2. **Emerald Royale** — emerald baize green + gold (classic table, modernized).
3. **Crimson High‑Roller** — rose‑red + gold on ink.
4. **Violet Lux** — magenta/purple neon + icy blue.
5. **Azure Ice** — cool blue + soft white.
6. **Gold Midnight** — warm amber/gold primary on brown‑black.

`ThemeProvider` responsibilities:

- Read `settings.theme`; fall back to default if unknown.
- Set `document.documentElement.dataset.theme`.
- Set `data-motion="reduced"` when `settings.reducedMotion` **or**
  `matchMedia('(prefers-reduced-motion: reduce)')` matches.
- Update `<meta name="theme-color">` to the theme’s chrome color.

---

## 4. Sound system

Synthesized with Web Audio (no files). `soundEngine.ts` exports a singleton:

- Lazily creates one `AudioContext`; a master `GainNode` for volume.
- `resume()` bound to the first `pointerdown`/`keydown`/`touchstart` to satisfy
  mobile autoplay policies.
- `setEnabled(bool)`, `setVolume(0..1)`, `play(name)`.
- Guards: no‑op when disabled, when tab hidden, or when `AudioContext`
  unavailable; simple rate‑limit so rapid taps don’t clip.

**Sound set** (short, tasteful, "chips & UI" not arcade):

| name       | when                       | character                        |
|------------|----------------------------|----------------------------------|
| `tap`      | generic button             | soft square blip                 |
| `key`      | keypad/picker digit        | very short tick                  |
| `toggle`   | switch/segment change      | two‑tone click                   |
| `nav`      | bottom‑nav change          | airy blip                        |
| `deal`     | card advance/swipe/reveal  | filtered‑noise whoosh            |
| `correct`  | right answer               | bright major two‑note chime      |
| `wrong`    | wrong answer               | soft low buzz (not harsh)        |
| `win`      | session complete           | short ascending arpeggio + shine |

`useSound()` returns a stable `play` that respects `settings.soundEnabled`
(engine also enforces this). Volume from `settings.soundVolume`.

---

## 5. Motion system

CSS‑driven; all gated behind `html:not([data-motion="reduced"])`.

- **Route transitions:** wrap `<Routes>` output with a per‑path `key` so each
  screen runs a `view-in` (fade + 8px rise) keyframe.
- **Ambient background:** slow, GPU‑cheap drift of the radial glows on `body::before`.
- **Buttons:** hover lift + accent glow; `:active` scale `0.97`; primary buttons
  get a slow sheen sweep.
- **Nav:** sliding luminous indicator under the active tab; icon pop on select.
- **Keypad / picker:** press scale + brief glow flash.
- **Feedback:** `.feedback.good` → glow‑pulse; `.feedback.bad` → 1 short shake.
- **Cards:** entrance `deal-in` (translateY + rotateX + fade); center deck card
  gets a soft accent glow.
- **Progress bar:** gradient fill + animated sheen.
- **Numbers:** `useCountUp` for accuracy %/streak on Home and Session Summary.
- **Reduced motion:** all keyframes reduced to instant; transitions ≤ 0.01ms.

Performance: animate only `transform`/`opacity`/`filter`; use `will-change`
sparingly (already present on deck cards).

---

## 6. Step‑by‑step build order

1. **Settings model** — extend `AppSettings` + `DEFAULT_SETTINGS` + repository
   merge. Verify `tsc`.
2. **Theme registry & provider** — `themes.ts`, `ThemeContext.tsx`; wrap in
   `main.tsx` (inside `SettingsProvider`).
3. **Sound engine & hook** — `soundEngine.ts`, `useSound.ts`; init enable/volume
   from settings in a provider effect; bind first‑gesture unlock.
4. **CSS overhaul** — rewrite `index.css`: tokens, theme blocks, glass surfaces,
   ambient bg, restyle every existing class, keyframes, reduced‑motion gate.
   Keep **all existing class names** so components keep working.
5. **App shell** — route transition wrapper + animated nav indicator + `nav`
   sound.
6. **Interactions** — wire `tap`/`key`/`correct`/`wrong`/`deal`/`win` into
   buttons, keypad, picker, deck, runner, summary; add motion classes.
7. **Settings UI** — Appearance section: theme swatch picker, sound toggle,
   volume slider, reduced‑motion toggle (each previews via a sound).
8. **Meta** — default `theme-color` in `index.html` + manifest.
9. **Verify** — `npm run lint`, `npm run test`, `npm run build`. Fix all.

---

## 7. Acceptance criteria

- [ ] Six themes selectable in **Settings → Appearance**; choice persists across
      reloads and applies instantly (background, accents, chrome color).
- [ ] Default theme is **Neon Noir** (futuristic minimal casino).
- [ ] Every interactive element has hover/press feedback; screens transition in.
- [ ] Correct/wrong/reveal/win/keypad/nav sounds play and are muteable; volume
      slider works; first tap unlocks audio on mobile.
- [ ] `prefers-reduced-motion` and the in‑app motion toggle disable animation.
- [ ] Text contrast is comfortable in every theme; nothing is pure‑white‑on‑pure‑black.
- [ ] `npm run lint`, `npm run test`, `npm run build` all pass.
- [ ] No new runtime network dependencies or binary assets; PWA stays offline.

---

## 8. Follow‑up ideas (out of scope for first pass)

- Self‑hosted display font (`--font-display`) for stronger sci‑fi headings.
- Optional light "Platinum" theme for bright environments.
- Confetti/chip‑shower canvas on a perfect session (respecting reduced motion).
- Haptics (`navigator.vibrate`) paired with `correct`/`wrong` on supported devices.
- Per‑theme accent for the PWA maskable icon.
