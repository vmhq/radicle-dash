# radprofile.xyz

**Note:** Root [`README.md`](../README.md) is **gitignored** so you can keep private or machine-specific notes there. **This file** is the canonical, version-controlled project overview for contributors and Radicle clones.

A self-hosted, open-source dashboard that turns your local [Radicle](https://radicle.xyz) node into a beautiful public profile — and a curated showcase of your repositories — without ever depending on a SaaS, CDN, or third-party API.

```
┌─ your laptop / home server ────────────────────────────────┐
│                                                            │
│   rad node ──► radicle-httpd ──► Next.js dashboard         │
│        │              │                  │                 │
│        ▼              ▼                  ▼                 │
│   peer-to-peer    JSON API         /  /profile  /node      │
│                                                            │
└────────────────────────────────────────────────────────────┘
                       │
                       ▼ (optional, free, $0/month)
            Cloudflare Tunnel
                       │
                       ▼
              https://yourname.dev
              https://radprofile.xyz
```

## What you get

- **`/`** — Marketing landing page describing the project and its features
- **`/profile`** — Your curated profile: avatar, bio, social links, contribution heatmap, recent commits, and a searchable grid of your featured repositories with copy-as-clone snippets
- **`/node`** — The whole-node browser: every repo your node is replicating, with All / Pinned filtering and search
- **One codebase, two URLs** — A `SITE_MODE` env var flips a single Next.js build between the marketing site and your personal profile, served on different ports

All pages render **server-side** from your local `radicle-httpd`. There are no analytics, no third-party scripts, no API keys. The dashboard is a thin, polished view over data you already control.

## Why

GitHub is a single point of failure that increasingly mediates open-source software. Radicle is a peer-to-peer alternative that keeps the git workflow but removes the dependency on any one company. The official [Radicle Explorer](https://radicle.network) is great for browsing one repository at a time on a shared seed — this is the missing piece on the other side: a personal homepage on the network, polished enough to actually share, that anyone can self-host in minutes.

## Repository layout

| Path | What's in it |
|------|--------------|
| [`dashboard/`](../dashboard/) | The Next.js application. See [`dashboard/README.md`](../dashboard/README.md). |
| [`infra/`](../infra/) | Caddy snippets for local `*.localhost` hostnames + the publish-to-the-internet runbook. See [`infra/README.md`](../infra/README.md). |
| [`scripts/`](../scripts/) | Shell helpers, currently just `radicle-start` (boots `rad node` + `radicle-httpd` together). |
| [`PUBLISHED_REPOS.template.md`](../PUBLISHED_REPOS.template.md) | Copy to `PUBLISHED_REPOS.md` (gitignored) for a local RID tracker; the app uses `RADICLE_REPO_IDS` in `.env.local`. |

## Quickstart (5 minutes, all on one Mac)

### 1. Run a Radicle node and the HTTP daemon

```bash
brew install radicle
rad auth                              # one-time: create your identity
# Manually drop radicle-httpd into ~/.radicle/bin (see infra/PUBLISH_WITH_CLOUDFLARE.md
# step 0c for details), then in one terminal:
rad node start
radicle-httpd --listen 0.0.0.0:8090
```

### 2. Run the dashboard

```bash
cd dashboard
cp .env.example .env.local            # edit RADICLE_HTTP_BASE if needed
npm install
npm run dev                           # http://localhost:3100
```

By default `/profile` shows an "configure me" empty state until you set
`RADICLE_REPO_IDS`. `/node` will already list whatever repositories your
node is replicating.

### 3. Make it yours

In `dashboard/.env.local`:

```bash
RADICLE_PROFILE_ALIAS=your_alias
RADICLE_DELEGATE_DID=did:key:z6Mk...
RADICLE_REPO_IDS=rad:zAbCd...,rad:zEfGh...
RADICLE_PROFILE_BIO=One-line bio about you.
RADICLE_PROFILE_LINKS=site:https://you.dev, email:mailto:you@example.com
# Drop an image in dashboard/public/ and reference it:
# RADICLE_PROFILE_AVATAR_URL=/me.jpg
```

Restart the dev server after edits — Next.js only reads env files at boot.

See [`dashboard/README.md`](../dashboard/README.md) for the full env-var reference.

## Before you publish this tree on Radicle

`rad init` / `git push rad` should only ever carry **source**. Quick checks:

1. **`dashboard/.env.local`** must stay untracked (listed in `.gitignore`). Never `git add -f` it.
2. Delete local build output: `rm -rf dashboard/.next` (it is ignored, but avoids accidents and drops absolute paths from your machine out of the working tree).
3. **`AGENT_SESSION_CONTEXT.md`**, **`id.md`**, **`PUBLISHED_REPOS.md`**, root **`README.md`**, avatar blobs under `dashboard/public/`, and **`~/.cloudflared` copies** are ignored — do not force-add them.
4. Run `git status` and skim the list before every push.

## Going public

Two flexible options, both documented here:

- **Caddy locally** ([`infra/README.md`](../infra/README.md)) — gives you `personal.localhost`, `marketing.localhost`, and `api.localhost` URLs that work on your Mac without `/etc/hosts` edits, with a thin reverse proxy that survives reboots via `brew services`.
- **Cloudflare Tunnel for the public internet** ([`infra/PUBLISH_WITH_CLOUDFLARE.md`](../infra/PUBLISH_WITH_CLOUDFLARE.md)) — turns the same machine into a fully public deployment with `https://`. **No** open router ports, **no** exposing your home IP, **$0/month** hosting cost (you pay only for the domain).

## Design principles

- **Sovereign by default** — No SaaS account, no API key, no hosted backend. The dashboard talks to a Radicle daemon you control.
- **Bring your own host** — Laptop, home server, VPS. Anywhere Node.js runs.
- **Plain Next.js** — App Router, Tailwind v4, lucide-react, server components. Tweak the components, theme, fonts. No proprietary primitives.
- **Per-RID resilient** — `/profile` works even when `radicle-httpd`'s `/repos` index is empty. Configure the RIDs you care about and they show up.
- **Two sites, one codebase** — `SITE_MODE` flips behavior at boot, so you build once and run twice for less than 200MB of memory total.
- **No telemetry** — Zero analytics, zero third-party scripts, zero hosted backend. Just static HTML rendered from your node.

## Stack

- Next.js 15 (App Router) · Tailwind v4 · TypeScript 5
- `lucide-react` for icons · `next/og` for OG image + favicon · `next/font/google` for Inter + JetBrains Mono
- Caddy 2 for local reverse proxy · Cloudflare Tunnel for public exposure (both optional)

## License

[Apache 2.0](../LICENSE)

## Contributing

This is the canonical source for radprofile.xyz. Pull requests, patches, and issues all work through Radicle — see the project's RID in the footer of any deployed instance. For a local RID list, copy [`PUBLISHED_REPOS.template.md`](../PUBLISHED_REPOS.template.md) to `PUBLISHED_REPOS.md` (that name stays untracked).
