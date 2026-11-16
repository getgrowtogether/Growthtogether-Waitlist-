# GrowTogether — Waitlist Backend

Zero-dependency Node service that powers the GrowTogether waitlist.

- `POST /api/waitlist` — save a signup `{email, name, location, type, url, ref}`.
  Duplicate emails return the original invite code and position. A valid `ref`
  (someone's invite code) increments that member's invite count.
- `GET /api/count` — public signup count.
- `GET /api/export?token=<ADMIN_TOKEN>` — full list (admin only).
- `DELETE /api/record?token=<ADMIN_TOKEN>&email=...` — remove a record (admin only).
- `GET /health` — service check.

Invite codes are generated from the email with the exact same hash the join page
uses, so a code is identical whether the backend or the page's offline fallback
created it.

Env vars: `PORT` (set by Render), `ADMIN_TOKEN`, `ALLOWED_ORIGIN` (default `*`),
`DATA_FILE`, and optional `TG_BOT_TOKEN` + `TG_CHAT_ID` to mirror every signup to
Telegram as a durable log.

Run: `node server.js` (Node 18+). No build step, no dependencies.

After deploying to Render, set `BACKEND_URL` at the top of
`../site/join.html` to the live service URL (no trailing slash). Until then
the join page keeps its offline behaviour: it saves the signup on the
visitor's device and shows the same invite code (the hash matches the
backend's, verified live 2026-11-16).
