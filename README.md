# radprofile.xyz

A self-hosted, open-source **Radicle profile dashboard**: a public-facing **`/profile`** page (repos, activity, bio, links) and a full-node **`/node`** explorer, all driven by your own **`radicle-httpd`** — no hosted git forge, no analytics bundle, no API keys in the app.

If you run Radicle locally and want a polished page to share your work, this is for you.

```
┌─ your laptop / home server ────────────────────────────────┐
│                                                            │
│   rad node ──► radicle-httpd ──► Next.js dashboard         │
│        │              │                  │                 │
│        ▼              ▼                  ▼                 │
│   peer-to-peer    JSON API         /profile   /node        │
│                                                            │
└────────────────────────────────────────────────────────────┘
                       │
                       ▼ (optional — HTTPS / DNS only)
            reverse proxy, Caddy, or a tunnel you choose
                       │
                       ▼
              https://your-domain.example
```

## What you get

- **`/profile`** — Your public profile: alias, DID, optional bio and links, contribution-style activity view, recent commits, and a searchable grid of repositories you configure (with copy-friendly clone hints).
- **`/node`** — Everything your node is replicating: search, sort, and All / Pinned views over `radicle-httpd`.
- **`/`** — Redirects to **`/profile`** so your canonical URL is still the site root.

Pages are rendered **server-side** from your `radicle-httpd` JSON API.

## Why

Centralized **git forges** (GitHub and similar) concentrate hosting, discovery, and policy. **Radicle** spreads collaboration and history across a network instead of a single vendor. This repo is a **small UI** on top of your node: a personal homepage and inventory view, next to the official [Radicle Explorer](https://radicle.network).

## Repository layout

| Path | What's in it |
|------|--------------|
| [`dashboard/`](./dashboard/) | Next.js app — start here. See [`dashboard/README.md`](./dashboard/README.md). |
| [`infra/`](./infra/) | Optional Caddy snippets (`*.localhost`) and docs for exposing the app with HTTPS. See [`infra/README.md`](./infra/README.md). |
| [`scripts/`](./scripts/) | Helper to start `rad node` + `radicle-httpd` together (`radicle-start`). |
| [`PUBLISHED_REPOS.template.md`](./PUBLISHED_REPOS.template.md) | Optional local RID tracker (copy to gitignored `PUBLISHED_REPOS.md`); the app uses **`RADICLE_REPO_IDS`** in `.env.local`. |

## Quickstart (personal site)

### 1. Radicle node + HTTP daemon

```bash
brew install radicle
rad auth                              # one-time: create your identity
# Install radicle-httpd into ~/.radicle/bin (see infra/PUBLISH_WITH_CLOUDFLARE.md note), then:
rad node start
radicle-httpd --listen 0.0.0.0:8090
```

### 2. Dashboard (personal mode)

```bash
cd dashboard
cp .env.example .env.local
# Edit .env.local: RADICLE_HTTP_BASE if needed, then profile vars below.
npm install
npm run dev                           # default dev port 3100 → http://localhost:3100 → /profile
```

For production-style runs after `npm run build`:

```bash
npm run start:personal                # PORT=3100 (production server)
```

### 3. Point `/profile` at your identity and repos

In `dashboard/.env.local`:

```bash
RADICLE_PROFILE_ALIAS=your_alias
RADICLE_DELEGATE_DID=did:key:z6Mk...
RADICLE_REPO_IDS=rad:zAbCd...,rad:zEfGh...
# Optional: bio, links, avatar — see dashboard/.env.example
```

Run **`rad seed <rid>`** on the **same machine as `radicle-httpd`** for each RID so the API returns 200 for those repos.

The **`/node`** **Pinned** tab reflects **`web.pinned.repositories`** in **`$RAD_HOME/config.json`** (often `~/.radicle/config.json`). There is no `rad pin` command — add RIDs there to curate pins, then restart `radicle-httpd` if needed. **`/profile`** uses only **`RADICLE_REPO_IDS`** in `.env.local`, not the pinned list.

Restart Next after env changes.

## Activity snapshot (M1 dev → M3 site)

Radicle’s current model makes it awkward to run **the same node identity** on two laptops, while your **public Next.js site** may stay on **M3** and `radicle-httpd` there may not see commits until replication catches up from **M1**.

Optional workaround:

1. On **M1** (with `rad node` + `radicle-httpd` and fresh git history), from the **repo root**:

   ```bash
   cd dashboard
   npm run export-activity
   ```

   This reads `RADICLE_HTTP_BASE` and `RADICLE_REPO_IDS` from **`dashboard/.env.local`**, calls your local HTTP API, and writes **`dashboard/data/activity-snapshot.json`** (gitignored).

2. Copy that file to **M3** (same path under your clone: `dashboard/data/activity-snapshot.json`), e.g. `scp` or AirDrop.

3. On **M3**, in **`dashboard/.env.local`**, set:

   ```bash
   RADICLE_ACTIVITY_SNAPSHOT_PATH=data/activity-snapshot.json
   ```

4. **Rebuild + restart** Next on M3 so the env is picked up.

Then **heatmap** and **recent activity** use the snapshot; **repository cards** still come from **`RADICLE_HTTP_BASE`** on M3 (replication / seeding as today). Re-run the export and re-copy whenever you want the public view to catch up.

## Before you push source to Radicle

1. **`dashboard/.env.local`** must stay untracked. Never `git add -f` it.
2. `rm -rf dashboard/.next` before commits if you want a clean tree (`.next` is ignored).
3. Do not force-add gitignored personal files (`README.local.md`, `PUBLISHED_REPOS.md`, avatars in `public/`, etc.).
4. `git status` before every push.

## Going public (optional)

You still need DNS/TLS in front of Next.js; that layer is **your** choice (home server, VPS, Caddy, another reverse proxy, or a tunnel if you cannot open ports). This repo includes **[`infra/README.md`](./infra/README.md)** (Caddy + `*.localhost`) and **[`infra/PUBLISH_WITH_CLOUDFLARE.md`](./infra/PUBLISH_WITH_CLOUDFLARE.md)** (one documented tunnel option — optional, not required by Radicle).

## Design principles

- **Sovereign by default** — The app talks only to **your** `radicle-httpd` (configurable base URL). No SaaS backend for rendering.
- **Bring your own host** — Anywhere Node.js runs.
- **Plain Next.js** — App Router, Tailwind v4, TypeScript. Fork the UI if you like.
- **Per-RID resilient** — `/profile` uses the RID list you configure even when the node’s repo index is sparse.
- **No telemetry** — No analytics or third-party scripts in the shipped UI.

## Stack

Next.js 15 · Tailwind v4 · TypeScript 5 · `lucide-react` · optional Caddy / tunnel docs in `infra/`.

## License

[Apache 2.0](./LICENSE)

## Contributing

Patches and discussion flow through **Radicle** for this project. Use the **Source** link on a deployed instance or your usual Radicle workflow. For a private RID scratchpad, copy [`PUBLISHED_REPOS.template.md`](./PUBLISHED_REPOS.template.md) to gitignored `PUBLISHED_REPOS.md`.
