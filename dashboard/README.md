# radprofile.xyz · dashboard

Next.js (App Router) site that reads your local [`radicle-httpd`][httpd] JSON API and renders:

- **`/profile`** — curated repository list with bio, contribution heatmap, and recent-activity feed
- **`/node`** — every repo your node is replicating, with **All / Pinned** filter and search
- **`/`** — redirects to **`/profile`**

See [`../infra/README.md`](../infra/README.md) for optional Caddy (`*.localhost`) in front of the dev server and `radicle-httpd`.

## Prerequisites

- Node 20+
- A running Radicle node and `radicle-httpd` (default expected at `http://127.0.0.1:8090`)
- Repositories seeded on that node (`rad seed <rid>`)

## Quickstart

```bash
cp .env.example .env.local
# edit RADICLE_HTTP_BASE if your HTTP daemon is not on port 8090
npm install
npm run dev
```

Open <http://localhost:3100>. Until you set `RADICLE_REPO_IDS`, `/profile` will render a "configure me" empty state; `/node` will list whatever your node already has.

## Production

After `npm run build`, run the production server (default port **3100**):

```bash
npm run start:personal
```

For going public (HTTPS, DNS), see [`../infra/README.md`](../infra/README.md) and [`../infra/PUBLISH_WITH_CLOUDFLARE.md`](../infra/PUBLISH_WITH_CLOUDFLARE.md).

## Environment

All variables live in `dashboard/.env.local`. See [`.env.example`](.env.example) for an annotated copy.

### Required

| Variable | Purpose |
|----------|---------|
| `RADICLE_HTTP_BASE` | Base URL of `radicle-httpd` (default `http://127.0.0.1:8090`) |

### Site mode

| Variable | Purpose |
|----------|---------|
| `SITE_MODE` | Use `personal` so `/` redirects to `/profile` (see `.env.example`). |

### Profile customization

| Variable | Purpose |
|----------|---------|
| `RADICLE_PROFILE_ALIAS` | Display name on `/profile` |
| `RADICLE_DELEGATE_DID` | Your `did:key:…` (shown truncated, copy-able) |
| `RADICLE_PROFILE_BIO` | One-line bio under the alias |
| `RADICLE_PROFILE_LINKS` | `label:url, label:url` — chips in the hero (e.g. `site:https://you.dev, email:mailto:you@example.com`) |
| `RADICLE_PROFILE_AVATAR_URL` | Path under `/public` (`/me.jpg`) or full URL. Falls back to a generative gradient + initials. |
| `RADICLE_REPO_IDS` | Comma-separated RIDs to feature on `/profile`. If unset, the page renders an empty state. |
| `RADICLE_ACTIVITY_EXPORT_REPO_IDS` | **Export only** (`npm run export-activity`). If set, overrides which RIDs are scanned for the snapshot; if unset, export uses `RADICLE_REPO_IDS`. Use a single value `all` or `*` to pull every repo from `GET /api/v1/repos?show=all` (new projects without editing the profile list). Do **not** set `RADICLE_REPO_IDS=all`. |
| `RADICLE_ACTIVITY_HISTORY_DAYS` | How far back `/profile` pulls commits (default **1095** ≈ 3 years; clamped 30–3650). |
| `RADICLE_ACTIVITY_MAX_COMMIT_PAGES` | Max `?page=` fetches per repo at 5 commits/page (default **3000** ≈ 15k commits; clamped 1–20000). |
| `RADICLE_ACTIVITY_ANCESTRY_MAX_COMMITS` | Max `GET .../commits/<oid>` fetches **after** expanding parents from commits already loaded from pagination (default **8000**; clamped 0–50000; **0** disables). |
| `RADICLE_ACTIVITY_SNAPSHOT_PATH` | Optional JSON file for heatmap/feed; when set, **overrides** live activity until unset or the file is re-generated (see root README). Relative paths are tried from `process.cwd()`, `process.cwd()/dashboard`, and `process.cwd()/..`. Prefer an **absolute** path in production. |

### Misc

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_RADICLE_EXPLORER_ORIGIN` | Explorer base URL (default `https://radicle.network`) |
| `NEXT_PUBLIC_RADICLE_EXPLORER_NODE` | Seed hostname in Explorer links (default `iris.radicle.xyz`). Must replicate your RIDs or Explorer shows fetch errors. |
| `NEXT_PUBLIC_SOURCE_URL` | Override footer **Source** link; default in code is this repo on [Radicle Explorer](https://radicle.network) |
| `SITE_URL` | Public origin used for `<meta>` tags (`metadataBase`). Set this in production. |
| `PORT` | Override the dev/start port (default `3100`) |

## How it talks to `radicle-httpd`

| Page | API call(s) |
|------|-------------|
| `/profile` | `GET .../repos/<rid>`; paginated `GET .../commits?page=`; `GET .../commits/<meta.head>`; optional **parent-walk** via repeated `GET .../commits/<oid>` following `parents` (bounded by env) |
| `/node` | `GET /api/v1/repos?show=all` and `?show=pinned` (so the toggle counts are accurate); `GET /api/v1/node` for the alias and NID |

`show=pinned` follows **`web.pinned.repositories`** in **`$RAD_HOME/config.json`** (Radicle home is usually `~/.radicle`). There is no `rad pin` command — edit that JSON list to curate pins, then restart `radicle-httpd` if your build only reloads config at startup. The default **All** tab uses `show=all`. `radicle-httpd` also caps `perPage` at 5 and ignores `since=`, so commit pagination is done client-side: every page is scanned (up to `RADICLE_ACTIVITY_MAX_COMMIT_PAGES`) and commits inside `RADICLE_ACTIVITY_HISTORY_DAYS` are kept. **Parent walk** expands `parents` from every commit already in that paginated set (no extra HTTP), then follows unknown parents with `GET .../commits/<oid>` up to `RADICLE_ACTIVITY_ANCESTRY_MAX_COMMITS`, and enqueues `meta.head` if it was not reached yet — so merge second parents and gaps vs the paginated slice are filled when the API exposes parent IDs. Timestamps are normalized if the API returns epoch milliseconds or numeric strings.

Every fetch uses `cache: "no-store"` and the pages are `force-dynamic`, so refreshing always shows the current state of your node.

## Project layout

```
src/
  app/
    page.tsx              root route (redirects to /profile)
    profile/page.tsx      curated profile
    node/page.tsx         whole-node browser
    layout.tsx            metadata, fonts
    globals.css           tokens, animations
    icon.tsx              favicon (next/og)
    opengraph-image.tsx   social-card image
  components/
    Avatar.tsx            generative monogram (or imageUrl)
    SiteHeader.tsx        sticky nav
    SiteFooter.tsx        footer
    Backdrop.tsx          mesh-gradient backdrop
    BrowserFrame.tsx      decorative browser chrome (live preview)
    RepoCard.tsx          one repo, with copy-RID + clone snippet
    RepoExplorer.tsx      client-side search + sort
    StatTile.tsx          compact stat card
    ShowToggle.tsx        All / Pinned segmented control
    ProfileBio.tsx        bio + social-link chips
    RecentActivity.tsx    latest commits across profile RIDs
    ActivityHeatmap.tsx   contribution grid (week count follows `RADICLE_ACTIVITY_HISTORY_DAYS`)
    Quickstart.tsx        copy-able code blocks
    Faq.tsx               accordion
    CopyButton.tsx        copy-to-clipboard with feedback
  lib/
    env.ts                env helpers + SITE_MODE
    profileRepos.ts       profile env vars (alias, DID, bio, links, RIDs)
    radicle.ts            typed httpd client
    time.ts               relativeTime helper
    visual.ts             gradients, monograms, ID shortening
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Turbopack dev server (port from `$PORT`, default 3100) |
| `npm run build` | Production build |
| `npm run export-activity` | Write `data/activity-snapshot.json` from local `radicle-httpd` (see root README). Uses `RADICLE_REPO_IDS` unless `RADICLE_ACTIVITY_EXPORT_REPO_IDS` is set; that variable may be `all` to export every repo on the node. |
| `npm start` | Start the production build |
| `npm run start:personal` | `SITE_MODE=personal PORT=3100 npm start` |
| `npm run lint` | ESLint |

## Notes

- All API errors degrade gracefully — `/profile` shows a per-RID failure list, `/node` shows a single banner. Nothing crashes the page.
- The avatar accepts any `<img src>`-compatible URL. Files dropped under `dashboard/public/` are served at the site root (`public/me.jpg` → `/me.jpg`).
- The contribution-heatmap palette uses `color-mix(in oklab, var(--accent) …%, transparent)`, so swapping `--accent` in `globals.css` recolors it instantly.
- `prefers-reduced-motion` is respected for the green "Online" pulse.

[httpd]: https://docs.radicle.xyz/guides/seeder
