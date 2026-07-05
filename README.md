# Mnemonica Trainer

An installable Progressive Web App (PWA) for drilling the **Mnemonica** stacked-deck
order (Juan Tamariz). Works as a normal website on Android and iOS, and can be added to
your Home Screen to behave like a native app — including **daily push reminders**.

## Features

- **Two training modes**
  - _Card → Position_: see a classic playing card, type its stack number.
  - _Position → Card_: see a stack number, pick the card (rank + suit).
- **Configurable scope** — study the whole deck, specific sections (chunks of a chosen
  size), or a custom position range.
- **Authentic card faces** — real classic (CC0) SVG card art, not Unicode glyphs.
- **Instant feedback** — wrong answers reveal the correct card and are flagged; missed
  cards can be automatically re-drilled at the end of a session.
- **Rich stats** — per-session accuracy, response times (avg/fastest/slowest), accuracy
  by section, cards to review; plus lifetime history: day streak, accuracy trend, and a
  "cards to focus on" leaderboard of your weakest cards.
- **Offline-first** — the app shell and all card art are precached; training works with
  no connection. Progress/stats are stored on-device (IndexedDB).
- **Daily reminders** — real scheduled Web Push notifications at a time you choose
  (Android/desktop, and iOS 16.4+ once added to the Home Screen).

## Architecture

Single Railway service. An Express backend serves the built React PWA and a tiny Web
Push API. The backend only stores anonymous push subscriptions + reminder preferences;
all training data lives on the device. The schema leaves room for user accounts later
(`PushSubscription.userId` is nullable) and persistence is behind a `StatsRepository`
interface so a synced/remote store can be dropped in without UI changes.

```
frontend/   React + Vite + TypeScript PWA (vite-plugin-pwa / Workbox)
backend/    Express + Prisma (PostgreSQL) + web-push + node-cron
```

## Local development

Prerequisites: Node 20+, and a PostgreSQL database.

```bash
npm install

# 1. Generate VAPID keys for Web Push and copy them into your env
npm run generate-vapid

# 2. Create backend/.env (see .env.example) with DATABASE_URL + VAPID_* values
#    and set VITE_VAPID_PUBLIC_KEY to the same public key.

# 3. Apply the database schema
npm run prisma:migrate --workspace backend   # first time: creates the migration

# 4. Run both apps (frontend on :5173, backend on :8080, /api proxied)
npm run dev
```

Useful checks:

```bash
npm run test --workspace frontend    # core logic self-tests
npm run build                        # full production build (frontend + backend)
```

## Deploying to Railway

1. Create a new Railway project from this repo and add the **PostgreSQL** plugin
   (provides `DATABASE_URL`).
2. Generate VAPID keys locally (`npm run generate-vapid`) and set these service
   variables:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` — a `mailto:` address or `https:` URL (required by Apple)
   - `VITE_VAPID_PUBLIC_KEY` — same value as `VAPID_PUBLIC_KEY` (needed at build time)
3. Deploy. The build runs `npm install && npm run build`; the start command runs
   `prisma migrate deploy` and then boots the server (`railway.json`).

The Express server serves the SPA and the `/api/*` endpoints from one service, and a
`node-cron` job checks every minute for subscriptions whose local time matches their
reminder time and sends the push (cleaning up expired subscriptions automatically).

## Installing on your phone

- **Android (Chrome):** open the site → menu → _Add to Home screen_ / _Install app_.
- **iPhone/iPad (Safari):** open the site → Share → _Add to Home Screen_, then open the
  app from that icon. Notifications on iOS only work when launched from the Home Screen
  icon (iOS 16.4+).

## Card artwork

Card faces are from Adrian Kennard's classic English-pattern SVG deck (public domain,
CC0) via the [`@letele/playing-cards`](https://github.com/letele/playing-cards) package.
