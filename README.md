<p align="center">
  <a href="https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/">
    <img src="https://growtogether-waitlist.onrender.com/og-image.png" alt="GrowTogether — free promotion for everything you create" width="100%">
  </a>
</p>

<h1 align="center">GrowTogether</h1>

<p align="center"><strong>Grow Together. Promote Together.</strong></p>

<p align="center">The free mutual-discovery circle for websites, apps, SaaS, Telegram bots and channels — discover others, get discovered.</p>

<p align="center">
  <img src="https://img.shields.io/badge/100%25-Free-black?style=flat-square" alt="100% Free">
  <img src="https://img.shields.io/badge/No_plans-No_pricing-black?style=flat-square" alt="No plans, no pricing">
  <img src="https://img.shields.io/badge/Waitlist-Open-black?style=flat-square" alt="Waitlist open">
  <img src="https://img.shields.io/badge/Projects-All_types_welcome-black?style=flat-square" alt="All project types welcome">
</p>

<p align="center"><strong><a href="https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/join.html">Join the waitlist →</a></strong></p>

---

## What is GrowTogether?

GrowTogether is a **mutual-discovery circle**. You bring a project; the circle shows it to other members; you discover theirs in return.

Discovery runs in a **fair rotation**, so every project in the circle gets its turn to be seen — not just the loudest ones.

GrowTogether is currently in its **waitlist phase**. Next comes an invite-only beta, then the public launch. Every member gets a **personal invite link** from day one — the builders you invite help you enter the beta sooner.

## How the circle works

1. **Join the waitlist** — add your project and get your personal invite link.
2. **Discover others** — browse projects from fellow members and find the ones worth your attention.
3. **Get discovered** — your project enters the fair rotation, and members discover it in return.

## Bring any project

Websites · Apps · SaaS · Telegram bots & channels · YouTube channels · Podcasts · Newsletters · Discord servers · Communities

If people can visit it, join it, or follow it, it belongs in the circle.

## Free promotion guides

Guides written for builders promoting on a zero budget — the same routes the circle itself is built on.

| Guide | What it covers |
| --- | --- |
| [Free Website Promotion](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/free-website-promotion.html) | The hub: every free promotion route in one place |
| [38 Free Advertising Sites](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/free-advertising-sites.html) | A directory of free places to promote your project |
| [Where to Promote Your Startup](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/where-to-promote-your-startup.html) | Where to submit a startup for its first users |
| [Cross-Promotion](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/cross-promotion.html) | Swap audiences with projects like yours |
| [Get Your First 100 Users](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/get-first-100-users.html) | From zero to your first 100 users, without ads |
| [Promote a Telegram Channel Free](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-telegram-channel-free.html) | Grow a Telegram channel or bot without spending |
| [Promote a YouTube Channel Without Paying](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-youtube-channel-free.html) | Get viewers with titles, Shorts, collabs and cross-promotion |
| [Promote an App Free](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-app-free.html) | Get your app its first downloads, free |
| [Promote a Podcast Free](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-podcast-free.html) | Find listeners on a zero budget |
| [Promote a Discord Server Free](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-discord-server-free.html) | Bring real members to a Discord server |
| [Promote an Instagram Page Free](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-instagram-page-free.html) | Grow an Instagram page without ads |
| [Promote a Facebook Page Free](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-facebook-page-free.html) | Promote a Facebook page for free |
| [Promote a Newsletter Free](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-newsletter-free.html) | Grow a newsletter with swaps and directories |
| [Promote a TikTok Account Free](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/promote-tiktok-account-free.html) | Promote a TikTok account without paying |

More about the circle: [About](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/about.html) · [How ranking works](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/how-ranking-works.html) · [Privacy](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/privacy.html) · [Terms](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/terms.html)

## Join the circle

### [Join the waitlist →](https://oumar9018-cmd.github.io/Growthtogether-Waitlist-/join.html)

Every member gets a personal invite link. Bring the builders you know — the circle grows when its members do.

## FAQ

**Is GrowTogether free?**
Yes — completely. There are no plans and no pricing; the circle is free for every member.

**When does it launch?**
In stages: waitlist first, then an invite-only beta with a first group of members, then the public launch. Joining the waitlist is how you get into the beta.

**What projects can join?**
Any digital project — websites, apps, SaaS, Telegram bots and channels, YouTube channels, podcasts, newsletters, communities and more.

**How is this different from traffic exchanges?**
Traffic exchanges send automated or paid visits that nobody pays attention to. GrowTogether is discovery by real members: people browse the circle to find projects, and yours is shown to them in a fair rotation. No bots, no fake traffic, no bought visits.

## Under the hood

This repo holds both halves of GrowTogether:

- **The site** — static pages at the repo root, served by GitHub Pages (landing, join page, guides).
- **The waitlist service** — `server.js`, a zero-dependency Node service (Node 18+, no build step, no dependencies) hosted on Render.

**Endpoints**

- `POST /api/waitlist` — save a signup `{email, name, location, type, url, ref}`. Duplicate emails return the original invite code and position. A valid `ref` (someone's invite code) increments that member's invite count.
- `GET /api/count` — public signup count.
- `GET /api/export?token=<ADMIN_TOKEN>` — full list (admin only).
- `DELETE /api/record?token=<ADMIN_TOKEN>&email=...` — remove a record (admin only).
- `GET /health` — service check.
- `GET /og-image.png` — the share image used across the site and at the top of this README.

Signups are stored in a JSON file on the service's disk. Invite codes are generated from the email with the exact same hash the join page uses, so a code is identical whether the service or the page's offline fallback created it. Env vars: `PORT` (set by Render), `ADMIN_TOKEN`, `ALLOWED_ORIGIN` (default `*`), `DATA_FILE`, and optional `TG_BOT_TOKEN` + `TG_CHAT_ID` to mirror every signup to Telegram as a durable log. After deploying, `BACKEND_URL` at the top of `join.html` must point at the live service URL (no trailing slash).

> **Read before deploying — two rules that protect the waitlist data:**
>
> 1. **Render auto-deploy is OFF on purpose.** Every redeploy wipes the free disk, and the signups stored on it are erased. Do not turn auto-deploy back on.
> 2. **Before ANY manual deploy, export the signups first** (`GET /api/export`), **and restore them after the deploy.** A deploy without an export first can permanently lose real signups.

---

<p align="center">Built in the open · <strong>GrowTogether</strong></p>
