# Mnemonica Trainer

An installable Progressive Web App (PWA) for drilling the **Mnemonica** stacked-deck
order (Juan Tamariz). Works as a normal website on Android and iOS, and can be added to
your Home Screen to behave like a native app.

**Static-only** — no server, no database, **$0 hosting** on GitHub Pages (or Cloudflare
Pages / Netlify).

## Features

- **Two training modes**
  - _Card → Position_: see a classic playing card, type its stack number.
  - _Position → Card_: see a stack number, pick the card (rank + suit).
- **Spaced review** — overdue cards first so memory lasts across days (Random and Dynamic queues still available).
- **Configurable scope** — full deck, sections (chunks of a chosen size), or a custom
  position range.
- **Authentic card faces** — real classic (CC0) SVG card art, not Unicode glyphs.
- **Instant feedback** — wrong answers reveal the correct card; missed cards can be
  re-drilled at the end of a session.
- **Rich stats** — per-session and lifetime accuracy, response times, section breakdown,
  day streak, and a weakest-cards leaderboard.
- **Offline-first** — the app shell and card art are precached; training works with no
  connection. All progress is stored on your device (IndexedDB).
- **Futuristic minimal casino look** — a glass-and-neon redesign with six color
  themes (Settings → Appearance), smooth animations, and synthesized sound
  effects (no audio files to download). Respects "reduce motion" and can be muted.
  See [`OVERHAUL_PLAN.md`](OVERHAUL_PLAN.md) for the design spec.

## Local development

Prerequisites: Node 20+

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # output in frontend/dist
npm run preview    # serve the production build locally
npm run test       # core logic self-tests
```

## Deploy to GitHub Pages (free)

1. Push this repo to GitHub and rename it to **`memtrainer`** (Settings → General →
   Repository name).
2. Make the repo **public** if it isn’t already (required for free GitHub Pages).
3. Merge to `main`. The workflow builds the PWA and publishes it to the **`gh-pages`**
   branch. It also tries to set **Settings → Pages → Deploy from branch → `gh-pages` /
   (root)** automatically.
4. If the live URL still shows this README instead of the app, set that Pages source
   manually once (see below).

Live URL (after deploy):

`https://zachmcune.github.io/memtrainer/`

If your repo name differs, update `VITE_BASE_PATH` in the workflow to
`/<your-repo-name>/` (must start and end with `/`).

### Site shows the README instead of the app?

GitHub Pages was probably serving the `main` branch through Jekyll (this file). Fix:

**Settings → Pages → Build and deployment → Source → Deploy from a branch → Branch:
`gh-pages` / Folder: `/ (root)`**

Then open the live URL in a private/incognito tab — you should see the trainer UI, not
this readme.

### Installed app not showing new features?

Safari may be serving an old cached copy (even in a normal tab). Try in order:

1. **Private tab test:** open the live URL in a **Private** Safari tab. If you see
   **Settings → Queue** and **Settings → About**, the site is fine — your main browser
   profile is just cached.
2. **One-tap refresh:** open
   `https://zachmcune.github.io/memtrainer/reset.html` — it clears the old cache and
   reloads the latest build.
3. **Manual clear:** Settings → Safari → Advanced → Website Data → remove
   `github.io` entries for this site, then reload.

Your training stats stay on the device through all of this.

### Other free hosts

The build output is plain static files in `frontend/dist`. You can also deploy to
**Cloudflare Pages** or **Netlify** — set the build command to `npm run build` and the
publish directory to `frontend/dist`. For a root domain (not a subpath), omit
`VITE_BASE_PATH` (defaults to `/`).

## Versioning

The app version comes from `frontend/package.json` (`version` field). Each production
build also gets a short git commit id (e.g. `v1.0.0 (a2626d2)`).

- **Settings → About** shows the installed version, latest online version, and update status.
- Bump `frontend/package.json` when you ship a meaningful release; every merge to `main`
  gets a unique build id even if the semver stays the same.
- The update banner appears when your installed build is behind the live site.

## Installing on your phone

- **Android (Chrome):** open the site → menu → _Add to Home screen_ / _Install app_.
- **iPhone/iPad (Safari):** open the site → Share → _Add to Home Screen_, then open from
  that icon for a full-screen app experience.

## Architecture

```
frontend/   React + Vite + TypeScript PWA (offline service worker, IndexedDB stats)
```

Training data never leaves the device. A future accounts/sync layer can replace the local
`StatsRepository` without changing the UI.

## Card artwork

Card faces are from Adrian Kennard's classic English-pattern SVG deck (public domain,
CC0) via the [`@letele/playing-cards`](https://github.com/letele/playing-cards) package.
